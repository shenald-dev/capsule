import type { PurifiedError } from '../../types.js';

const COMPILER_ERROR_REGEX = /^([a-zA-Z0-9_./\\: -]+):(\d+):(\d+):\s*(fatal error|error):\s*(.*)$/m;
const DOCKER_ERROR_REGEX = /(?:Error response from daemon|failed to solve):\s*(.*)/i;
const SHELL_ERROR_REGEX = /^(?:bash|sh|zsh|pwsh|powershell|cmd):\s*(.*)$/im;
const COMMON_ERRORS = [
  /cannot find module\s+['"]?([^'"\s]+)['"]?/i,
  /module not found:\s*(.*)/i,
  /eaddrinuse:?\s*(.*)/i,
  /enotfound\s+(.*)/i,
  /connection refused/i,
  /permission denied/i,
  /command not found:\s*(.*)/i
];

export function parseGenericError(output: string): PurifiedError {
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
