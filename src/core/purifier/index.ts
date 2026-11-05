import type { PurifiedError } from '../../types.js';
import { parseNodeStacktrace } from './node.js';
import { parsePythonTraceback } from './python.js';
import { parseRustPanic } from './rust.js';
import { parseGenericError } from './generic.js';

export function purifyErrorOutput(combinedOutput: string): PurifiedError {
  // Normalize Windows line endings and strip ANSI color escape codes before semantic parsing
  const clean = combinedOutput
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );

  const nodeResult = parseNodeStacktrace(clean);
  if (nodeResult) return nodeResult;

  const pythonResult = parsePythonTraceback(clean);
  if (pythonResult) return pythonResult;

  const rustResult = parseRustPanic(clean);
  if (rustResult) return rustResult;

  return parseGenericError(clean);
}
