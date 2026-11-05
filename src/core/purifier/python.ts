import fs from 'node:fs';
import type { PurifiedError, StackFrame } from '../../types.js';

const PY_FRAME_REGEX = /^\s*File\s+"([^"]+)",\s+line\s+(\d+)(?:,\s+in\s+([a-zA-Z0-9_<>\s.]+))?/;
const PY_ERROR_REGEX = /^([a-zA-Z0-9_.]+(?:Error|Exception|Interrupt|Exit)):\s*(.*)$/m;

export function parsePythonTraceback(output: string): PurifiedError | null {
  if (!output.includes('Traceback (most recent call last):') && !PY_ERROR_REGEX.test(output)) {
    return null;
  }

  const lines = output.split('\n');
  const errorMatch = output.match(PY_ERROR_REGEX);

  const errorName = errorMatch ? errorMatch[1] : 'PythonError';
  const errorMessage = errorMatch ? errorMatch[2].trim() : 'Script exited with Python traceback';

  const allFrames: StackFrame[] = [];
  let rootFile: string | undefined;
  let rootLine: number | undefined;

  for (const line of lines) {
    const frameMatch = line.match(PY_FRAME_REGEX);
    if (!frameMatch) continue;

    const filePath = frameMatch[1];
    const lineNum = parseInt(frameMatch[2], 10);
    const fnName = frameMatch[3]?.trim();

    const isInternal =
      filePath.includes('site-packages') ||
      filePath.includes('dist-packages') ||
      filePath.includes('/lib/python') ||
      filePath.includes('\\lib\\python');

    allFrames.push({
      file: filePath,
      line: lineNum,
      functionName: fnName,
      isInternal
    });

    if (!isInternal) {
      rootFile = filePath;
      rootLine = lineNum;
    }
  }

  if (!rootFile && allFrames.length > 0) {
    rootFile = allFrames[allFrames.length - 1].file;
    rootLine = allFrames[allFrames.length - 1].line;
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
    engine: 'python',
    name: errorName,
    message: errorMessage,
    file: rootFile,
    line: rootLine,
    codeSnippet,
    purifiedFrames: allFrames.filter((f) => !f.isInternal),
    rawTraceback: lines.slice(lines.findIndex((l) => l.includes('Traceback'))).join('\n')
  };
}
