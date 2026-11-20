import type { PurifiedError } from '../../types.js';

const COMPILER_ERROR_REGEX = /^([a-zA-Z0-9_./\\: -]+):(\d+):(\d+):\s*(fatal error|error):\s*(.*)$/m;
const DOCKER_ERROR_REGEX = /(?:Error response from daemon|failed to solve):\s*(.*)/i;
const SHELL_ERROR_REGEX = /^(?:bash|sh|zsh|pwsh|powershell|cmd):\s*(.*)$/im;
const ASAN_ERROR_REGEX = /==\d+==ERROR:\s*(AddressSanitizer|LeakSanitizer|UndefinedBehaviorSanitizer):\s*(.*)/i;
const SEGFAULT_REGEX = /(?:segmentation fault|sigsegv|fatal signal 11)/i;
const OOM_REGEX = /(?:out of memory|javascript heap out of memory|fatal error: runtime: out of memory|killed: 9|oom-killer)/i;

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

  const compilerMatch = output.match(COMPILER_ERROR_REGEX);
  if (compilerMatch) {
    return {
      engine: 'generic',
      name: compilerMatch[4].toUpperCase(),
      message: compilerMatch[5].trim(),
      file: compilerMatch[1].trim(),
      line: parseInt(compilerMatch[2], 10),
      column: parseInt(compilerMatch[3], 10),
      purifiedFrames: [],
      rawTraceback: compilerMatch[0]
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
