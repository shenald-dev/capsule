import fs from 'node:fs';
import type { PurifiedError, StackFrame } from '../../types.js';

const V8_HEADER_REGEX = /^([a-zA-Z0-9_$]*(?:Error|Exception)):\s*(.*)$/m;
const V8_FRAME_REGEX = /^\s*at\s+(?:([a-zA-Z0-9_$<>.\s[\]]+)\s+\()?([a-zA-Z0-9_./\\: -]+):(\d+):(\d+)\)?$/;

export function parseNodeStacktrace(output: string): PurifiedError | null {
  const normalized = output.replace(/\r/g, '');
  const lines = normalized.split('\n');
  const headerMatch = normalized.match(V8_HEADER_REGEX);
  if (!headerMatch) return null;

  const errorName = headerMatch[1];
  const errorMessage = headerMatch[2].trim();

  const allFrames: StackFrame[] = [];
  let rootFile: string | undefined;
  let rootLine: number | undefined;
  let rootCol: number | undefined;

  for (const line of lines) {
    const frameMatch = line.match(V8_FRAME_REGEX);
    if (!frameMatch) continue;

    const fnName = frameMatch[1]?.trim();
    let filePath = frameMatch[2]?.trim();
    const lineNum = parseInt(frameMatch[3], 10);
    const colNum = parseInt(frameMatch[4], 10);

    if (filePath.startsWith('file://')) {
      try {
        const parsedUrl = new URL(filePath);
        filePath = decodeURIComponent(parsedUrl.pathname);
        if (process.platform === 'win32' && filePath.startsWith('/')) {
          filePath = filePath.slice(1);
        }
      } catch {
        filePath = filePath.replace(/^file:\/\/\/?/, '');
      }
    }

    const isInternal =
      filePath.includes('node_modules') ||
      filePath.startsWith('node:') ||
      filePath.includes('node:internal') ||
      filePath.includes('internal/modules');

    const frame: StackFrame = {
      file: filePath,
      line: lineNum,
      column: colNum,
      functionName: fnName,
      isInternal
    };

    allFrames.push(frame);

    // First non-internal frame is our application root cause candidate
    if (!isInternal && !rootFile) {
      rootFile = filePath;
      rootLine = lineNum;
      rootCol = colNum;
    }
  }

  // Fallback to first frame if all are marked internal
  if (!rootFile && allFrames.length > 0) {
    rootFile = allFrames[0].file;
    rootLine = allFrames[0].line;
    rootCol = allFrames[0].column;
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

  return {
    engine: 'v8',
    name: errorName,
    message: errorMessage,
    file: rootFile,
    line: rootLine,
    column: rootCol,
    codeSnippet,
    purifiedFrames: allFrames.filter((f) => !f.isInternal),
    rawTraceback: lines.filter((l) => l.trim().startsWith('at ') || V8_HEADER_REGEX.test(l)).join('\n')
  };
}
