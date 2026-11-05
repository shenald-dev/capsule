import { executeCommand } from '../../core/runner.js';
import { renderSuccess, renderTriageCard } from '../ui/banners.js';
import { copyToClipboard } from '../../platform/clipboard.js';
import { theme } from '../../utils/theme.js';
import type { ExecutionOptions } from '../../types.js';

export async function runCommandAction(
  commandArgs: string[],
  options: ExecutionOptions & { autoCopy?: boolean }
): Promise<number> {
  if (commandArgs.length === 0) {
    console.error(`\n${theme.symbols.cross} ${theme.error('No command provided to run.')}`);
    console.error(`  ${theme.dim('Usage:')} ${theme.code('capsule run <command...>')}`);
    console.error(`  ${theme.dim('Example:')} ${theme.code('capsule run npm test')}\n`);
    return 1;
  }

  const [cmd, ...args] = commandArgs;

  const result = await executeCommand(cmd, args, {
    silent: options.silent,
    quiet: options.quiet,
    cwd: options.cwd
  });

  if (result.exitCode === 0) {
    if (!options.quiet && !options.silent) {
      renderSuccess(result.durationMs);
    }
    return 0;
  }

  if (result.capsule) {
    if (options.json) {
      console.log(JSON.stringify(result.capsule, null, 2));
    } else {
      renderTriageCard(result.capsule);
    }

    if (options.autoCopy || options.copy) {
      const copied = copyToClipboard(result.capsule.aiPrompt);
      if (copied) {
        console.log(` ${theme.symbols.check} ${theme.success('AI incident prompt copied to clipboard!')}\n`);
      }
    }
  }

  return result.exitCode;
}
