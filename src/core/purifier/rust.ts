import fs from 'node:fs';
import type { PurifiedError } from '../../types.js';

const RUST_MODERN_PANIC_REGEX = /thread\s+'([^']+)'\s+panicked\s+at\s+([^:]+):(\d+):(\d+):\s*\n([^\n]+)/m;
const RUST_LEGACY_PANIC_REGEX = /thread\s+'([^']+)'\s+panicked\s+at\s+['"]?([^'"]+)['"]?,\s+([^:]+):(\d+):(\d+)/;

export function parseRustPanic(output: string): PurifiedError | null {
  const modernMatch = output.match(RUST_MODERN_PANIC_REGEX);
  const legacyMatch = output.match(RUST_LEGACY_PANIC_REGEX);

  if (!modernMatch && !legacyMatch) return null;

  let threadName: string;
  let panicMessage: string;
  let file: string;
  let line: number;
  let column: number;
  let rawTraceback: string;

  if (modernMatch) {
    threadName = modernMatch[1];
    file = modernMatch[2].trim();
    line = parseInt(modernMatch[3], 10);
    column = parseInt(modernMatch[4], 10);
    panicMessage = modernMatch[5].trim();
    rawTraceback = modernMatch[0];
  } else {
    threadName = legacyMatch![1];
    panicMessage = legacyMatch![2];
    file = legacyMatch![3].trim();
    line = parseInt(legacyMatch![4], 10);
    column = parseInt(legacyMatch![5], 10);
    rawTraceback = legacyMatch![0];
  }

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
    rawTraceback
  };
}
