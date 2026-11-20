import fs from 'node:fs';
import path from 'node:path';
import type { PurifiedError, StackFrame } from '../../types.js';

const JVM_HEADER_REGEX = /(?:Exception in thread "[^"]*"\s+)?([a-zA-Z0-9_.$]+(?:Exception|Error))(?::\s*(.*))?/;
const JVM_FRAME_REGEX = /^\s*at\s+([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)*)\((?:([a-zA-Z0-9_./\\: -]+\.(?:java|kt|scala|groovy)):(\d+)|Native Method|Unknown Source)\)/;

export function parseJvmStacktrace(output: string): PurifiedError | null {
  const normalized = output.replace(/\r/g, '');
  const lines = normalized.split('\n');

  let headerMatch: RegExpMatchArray | null = null;
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(JVM_HEADER_REGEX);
    if (match) {
      headerMatch = match;
      headerIndex = i;
      break;
    }
  }

  if (!headerMatch) return null;

  const fullClassName = headerMatch[1];
  const simpleName = fullClassName.split('.').pop() || fullClassName;
  const message = headerMatch[2]?.trim() || 'JVM Runtime Exception';

  const allFrames: StackFrame[] = [];
  let rootFile: string | undefined;
  let rootLine: number | undefined;

  for (let i = headerIndex; i < lines.length; i++) {
    const line = lines[i];
    const frameMatch = line.match(JVM_FRAME_REGEX);
    if (!frameMatch) continue;

    const fullMethod = frameMatch[1];
    const sourceFile = frameMatch[2];
    const lineNum = frameMatch[3] ? parseInt(frameMatch[3], 10) : undefined;

    const isInternal =
      fullMethod.startsWith('java.') ||
      fullMethod.startsWith('javax.') ||
      fullMethod.startsWith('jdk.') ||
      fullMethod.startsWith('sun.') ||
      fullMethod.startsWith('org.gradle.') ||
      fullMethod.startsWith('org.junit.') ||
      fullMethod.startsWith('kotlin.coroutines.') ||
      fullMethod.startsWith('org.springframework.');

    const frame: StackFrame = {
      file: sourceFile || fullMethod,
      line: lineNum,
      functionName: fullMethod,
      isInternal
    };

    allFrames.push(frame);

    if (!isInternal && !rootFile && sourceFile) {
      rootFile = sourceFile;
      rootLine = lineNum;
    }
  }

  if (!rootFile && allFrames.length > 0) {
    rootFile = allFrames[0].file;
    rootLine = allFrames[0].line;
  }

  // Attempt to locate file locally if relative path or filename only
  let codeSnippet: string | undefined;
  let resolvedPath: string | undefined;

  if (rootFile && rootLine) {
    if (fs.existsSync(rootFile)) {
      resolvedPath = rootFile;
    } else {
      // Search current working directory recursively for this source file
      try {
        const fileName = path.basename(rootFile);
        const findInDir = (dir: string, depth = 0): string | undefined => {
          if (depth > 4) return undefined;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'build' && entry.name !== 'target') {
                const found = findInDir(path.join(dir, entry.name), depth + 1);
                if (found) return found;
              }
            } else if (entry.name === fileName) {
              return path.join(dir, entry.name);
            }
          }
          return undefined;
        };
        resolvedPath = findInDir(process.cwd());
      } catch {
        // Ignore resolution issues
      }
    }

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
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
  }

  return {
    engine: 'jvm',
    name: simpleName,
    message,
    file: resolvedPath || rootFile,
    line: rootLine,
    codeSnippet,
    purifiedFrames: allFrames.filter((f) => !f.isInternal),
    rawTraceback: lines.slice(headerIndex, headerIndex + 30).join('\n')
  };
}
