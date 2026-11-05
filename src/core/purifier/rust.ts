import fs from 'node:fs';
import type { PurifiedError } from '../../types.js';

const RUST_PANIC_REGEX = /thread\s+'([^']+)'\s+panicked\s+at\s+['"]?([^'"]+)['"]?,\s+([^:]+):(\d+):(\d+)/;

export function parseRustPanic(output: string): PurifiedError | null {
  const match = output.match(RUST_PANIC_REGEX);
  if (!match) return null;

  const threadName = match[1];
  const panicMessage = match[2];
  const file = match[3];
  const line = parseInt(match[4], 10);
  const column = parseInt(match[5], 10);

  let codeSnippet: string | undefined;
  if (fs.existsSync(file)) {
    try {
      const fileContent = fs.readFileSync(file, 'utf8');
      const fileLines = fileContent.split('\n');
      const start = Math.max(0, line - 3);
      const end = Math.min(fileLines.length, line + 2);
      codeSnippet = fileLines
        .slice(start, end)
        .map((l, idx) => {
          const currentLineNum = start + idx + 1;
          const marker = currentLineNum === line ? ' > ' : '   ';
          return `${marker}${currentLineNum} | ${l}`;
        })
        .join('\n');
    } catch {
      // Ignore reading issues
    }
  }

  return {
    engine: 'rust',
    name: 'RustPanic',
    message: `${panicMessage} (in thread '${threadName}')`,
    file,
    line,
    column,
    codeSnippet,
    purifiedFrames: [{ file, line, column, functionName: threadName, isInternal: false }],
    rawTraceback: match[0]
  };
}
