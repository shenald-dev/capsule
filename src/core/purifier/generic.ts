import fs from 'node:fs';
import type { PurifiedError } from '../../types.js';

const TS_ERROR_REGEX = /^([a-zA-Z0-9_./\\: -]+\.[jt]sx?):(\d+):(\d+)\s*-\s*error\s*(TS\d+):\s*(.*)$/m;
const RUSTC_ERROR_REGEX = /error(?:\[([A-Z0-9]+)\])?:\s*(.*)\n\s*-->\s*([a-zA-Z0-9_./\\: -]+):(\d+):(\d+)/m;
const COMPILER_LINE_COL_REGEX = /^([a-zA-Z0-9_./\\: -]+):(\d+):(\d+):\s*(fatal error|error):\s*(.*)$/m;
const COMPILER_LINE_ONLY_REGEX = /^([a-zA-Z0-9_./\\: -]+):(\d+):\s*(fatal error|error):\s*(.*)$/m;
const DOCKER_ERROR_REGEX = /(?:Error response from daemon|failed to solve):\s*(.*)/i;
const SHELL_ERROR_REGEX = /^(?:bash|sh|zsh|pwsh|powershell|cmd):\s*(.*)$/im;
const ASAN_ERROR_REGEX = /==\d+==ERROR:\s*(AddressSanitizer|LeakSanitizer|UndefinedBehaviorSanitizer):\s*(.*)/i;
const SEGFAULT_REGEX = /(?:segmentation fault|sigsegv|fatal signal 11)/i;
const OOM_REGEX = /(?:out of memory|javascript heap out of memory|fatal error: runtime: out of memory|killed: 9|oom-killer)/i;

function extractSnippet(file: string, line: number): string | undefined {
  if (file && line && fs.existsSync(file)) {
    try {
      const fileContent = fs.readFileSync(file, 'utf8');
      const fileLines = fileContent.split('\n');
      const start = Math.max(0, line - 3);
      const end = Math.min(fileLines.length, line + 2);
      return fileLines
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
  return undefined;
}

const COMMON_ERRORS = [
  /cannot find module\s+['"]?([^'"\s]+)['"]?/i,
  /module not found:\s*(.*)/i,
  /eaddrinuse:?\s*(.*)/i,
  /enotfound\s+(.*)/i,
  /connection refused/i,
  /permission denied/i,
  /command not found:\s*(.*)/i,
  /no such file or directory:\s*(.*)/i,
  /failed to compile/i,
  /syntaxerror:\s*(.*)/i,
  /undefined reference to\s+[`'"]?([^`'"\s]+)[`'"]?/i
];

export function parseGenericError(output: string): PurifiedError {
  const asanMatch = output.match(ASAN_ERROR_REGEX);
  if (asanMatch) {
    return {
      engine: 'generic',
      name: asanMatch[1],
      message: asanMatch[2].trim(),
      purifiedFrames: [],
      rawTraceback: asanMatch[0]
    };
  }

  const tsMatch = output.match(TS_ERROR_REGEX);
  if (tsMatch) {
    const file = tsMatch[1].trim();
    const line = parseInt(tsMatch[2], 10);
    const column = parseInt(tsMatch[3], 10);
    return {
      engine: 'generic',
      name: tsMatch[4],
      message: tsMatch[5].trim(),
      file,
      line,
      column,
      codeSnippet: extractSnippet(file, line),
      purifiedFrames: [{ file, line, column, isInternal: false }],
      rawTraceback: tsMatch[0]
    };
  }

  const rustcMatch = output.match(RUSTC_ERROR_REGEX);
  if (rustcMatch) {
    const file = rustcMatch[3].trim();
    const line = parseInt(rustcMatch[4], 10);
    const column = parseInt(rustcMatch[5], 10);
    const name = rustcMatch[1] ? `RustcError (${rustcMatch[1]})` : 'RustcError';
    return {
      engine: 'generic',
      name,
      message: rustcMatch[2].trim(),
      file,
      line,
      column,
      codeSnippet: extractSnippet(file, line),
      purifiedFrames: [{ file, line, column, isInternal: false }],
      rawTraceback: rustcMatch[0]
    };
  }

  const compilerColMatch = output.match(COMPILER_LINE_COL_REGEX);
  if (compilerColMatch) {
    const file = compilerColMatch[1].trim();
    const line = parseInt(compilerColMatch[2], 10);
    const column = parseInt(compilerColMatch[3], 10);
    return {
      engine: 'generic',
      name: compilerColMatch[4].toUpperCase(),
      message: compilerColMatch[5].trim(),
      file,
      line,
      column,
      codeSnippet: extractSnippet(file, line),
      purifiedFrames: [{ file, line, column, isInternal: false }],
      rawTraceback: compilerColMatch[0]
    };
  }

  const compilerLineMatch = output.match(COMPILER_LINE_ONLY_REGEX);
  if (compilerLineMatch) {
    const file = compilerLineMatch[1].trim();
    const line = parseInt(compilerLineMatch[2], 10);
    return {
      engine: 'generic',
      name: compilerLineMatch[3].toUpperCase(),
      message: compilerLineMatch[4].trim(),
      file,
      line,
      codeSnippet: extractSnippet(file, line),
      purifiedFrames: [{ file, line, isInternal: false }],
      rawTraceback: compilerLineMatch[0]
    };
  }

  if (SEGFAULT_REGEX.test(output)) {
    return {
      engine: 'generic',
      name: 'SegmentationFault',
      message: 'Process crashed with Segmentation Fault (SIGSEGV). Invalid memory access.',
      purifiedFrames: [],
      rawTraceback: output.slice(-500)
    };
  }

  if (OOM_REGEX.test(output)) {
    return {
      engine: 'generic',
      name: 'OutOfMemory',
      message: 'Process was terminated by system due to Memory Exhaustion (OOM).',
      purifiedFrames: [],
      rawTraceback: output.slice(-500)
    };
  }

  const dockerMatch = output.match(DOCKER_ERROR_REGEX);
  if (dockerMatch) {
    return {
      engine: 'generic',
      name: 'DockerError',
      message: dockerMatch[1].trim(),
      purifiedFrames: [],
      rawTraceback: dockerMatch[0]
    };
  }

  const shellMatch = output.match(SHELL_ERROR_REGEX);
  if (shellMatch) {
    return {
      engine: 'generic',
      name: 'ShellError',
      message: shellMatch[1].trim(),
      purifiedFrames: [],
      rawTraceback: shellMatch[0]
    };
  }

  for (const pattern of COMMON_ERRORS) {
    const match = output.match(pattern);
    if (match) {
      return {
        engine: 'generic',
        name: 'RuntimeError',
        message: match[0].trim(),
        purifiedFrames: [],
        rawTraceback: match[0]
      };
    }
  }

  // Fallback: Grab the last 3 non-empty lines as error summary
  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const tail = lines.slice(-3).join(' | ');

  return {
    engine: 'generic',
    name: 'CommandFailed',
    message: tail || 'Command exited with a non-zero exit code.',
    purifiedFrames: [],
    rawTraceback: output.slice(-1000)
  };
}
