import fs from 'node:fs';
import type { PurifiedError, StackFrame } from '../../types.js';

const GO_PANIC_REGEX = /panic:\s*(.*)/m;
const GO_GOROUTINE_REGEX = /goroutine\s+(\d+)\s+\[([^\]]+)\]:/;
const GO_CALL_LINE_REGEX = /^\s*(.+)\([^()]*\)$/;
const GO_FILE_LINE_REGEX = /^\s*([a-zA-Z0-9_./\\: -]+):(\d+)(?:\s+\+0x[0-9a-fA-F]+)?$/;

export function parseGoPanic(output: string): PurifiedError | null {
  const panicMatch = output.match(GO_PANIC_REGEX);
  if (!panicMatch && !output.includes('goroutine ') && !output.includes('fatal error:')) {
    return null;
  }

  const normalized = output.replace(/\r/g, '');
  const lines = normalized.split('\n');

  let errorName = 'GoPanic';
  let errorMessage = panicMatch ? panicMatch[1].trim() : 'Go runtime panic';

  if (!panicMatch) {
    const fatalMatch = output.match(/fatal error:\s*(.*)/);
    if (fatalMatch) {
      errorName = 'GoFatalError';
      errorMessage = fatalMatch[1].trim();
    }
  }

  const allFrames: StackFrame[] = [];
  let rootFile: string | undefined;
  let rootLine: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fileMatch = line.match(GO_FILE_LINE_REGEX);

    if (fileMatch) {
      const filePath = fileMatch[1].trim();
      const lineNum = parseInt(fileMatch[2], 10);
      let fnName: string | undefined;

      if (i > 0) {
        const prevLine = lines[i - 1].trim();
        if (prevLine.startsWith('created by ')) {
          const m = prevLine.match(/^created by\s+([^\s]+)/);
          fnName = m ? m[1] : prevLine;
        } else {
          const callMatch = prevLine.match(GO_CALL_LINE_REGEX);
          if (callMatch) {
            fnName = callMatch[1].trim();
          } else if (!prevLine.startsWith('goroutine ') && !prevLine.startsWith('panic:') && !prevLine.startsWith('fatal error:')) {
            fnName = prevLine;
          }
        }
      }

      const isInternal =
        filePath.includes('/src/runtime/') ||
        filePath.includes('\\src\\runtime\\') ||
        filePath.includes('/go/src/') ||
        filePath.includes('\\go\\src\\') ||
        filePath.startsWith('runtime/') ||
        (fnName ? fnName.startsWith('runtime.') || fnName.startsWith('testing.') : false);

      const frame: StackFrame = {
        file: filePath,
        line: lineNum,
        functionName: fnName,
        isInternal
      };

      allFrames.push(frame);

      if (!isInternal && !rootFile) {
        rootFile = filePath;
        rootLine = lineNum;
      }
    }
  }

  if (!rootFile && allFrames.length > 0) {
    rootFile = allFrames[0].file;
    rootLine = allFrames[0].line;
  }

  let codeSnippet: string | undefined;
  if (rootFile && rootLine && fs.existsSync(rootFile)) {
    try {
      const fileContent = fs.readFileSync(rootFile, 'utf8');
      const fileLines = fileContent.split('\n');
      const start = Math.max(0, rootLine - 3);
      const end = Math.min(fileLines.length, rootLine + 2);
      codeSnippet = fileLines
        .slice(start, end)
        .map((l, idx) => {
          const currentLineNum = start + idx + 1;
          const marker = currentLineNum === rootLine ? ' > ' : '   ';
          return `${marker}${currentLineNum} | ${l}`;
        })
        .join('\n');
    } catch {
      // Ignore reading issues
    }
  }

  const panicIndex = lines.findIndex((l) => l.includes('panic:') || l.includes('fatal error:') || l.includes('goroutine '));
  const rawTraceback = panicIndex !== -1 ? lines.slice(panicIndex, panicIndex + 40).join('\n') : output.slice(-1000);

  return {
    engine: 'go',
    name: errorName,
    message: errorMessage,
    file: rootFile,
    line: rootLine,
    codeSnippet,
    purifiedFrames: allFrames.filter((f) => !f.isInternal),
    rawTraceback
  };
}
