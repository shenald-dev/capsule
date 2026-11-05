import { loadIncident } from '../../core/storage.js';
import { executeCommand } from '../../core/runner.js';
import { renderTriageCard } from '../ui/banners.js';
import { formatDuration } from '../../utils/formatters.js';
import { theme } from '../../utils/theme.js';

export async function replayCommandAction(id?: string): Promise<number> {
  try {
    const target = id || 'latest';
    const original = loadIncident(target);

    console.log(
      `\n${theme.symbols.replay} ${theme.bold('Replaying incident:')} ${theme.code(original.command)} ${theme.dim(original.args.join(' '))}`
    );
    console.log(`   ${theme.dim(`Original: Exit ${original.exitCode} (${formatDuration(original.durationMs)}) on ${original.timestamp}`)}\n`);

    const result = await executeCommand(original.command, original.args);

    if (result.exitCode === 0) {
      console.log('\n' + theme.dim('═'.repeat(68)));
      console.log(` ${theme.symbols.sparkles} ${theme.success('ISSUE RESOLVED!')}  ${theme.dim('│')}  ${theme.white(original.command)}`);
      console.log(
        ` ${theme.dim('Previous:')} ${theme.error(`Exit ${original.exitCode}`)} ${theme.dim('➔')} ${theme.dim('Current:')} ${theme.success('Exit 0')} ${theme.dim(`(${formatDuration(result.durationMs)})`)}`
      );
      console.log(theme.dim('═'.repeat(68)) + '\n');
      return 0;
    }

    if (result.capsule) {
      renderTriageCard(result.capsule);
    }
    return result.exitCode;
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n${theme.symbols.cross} ${theme.error(error.message)}\n`);
    return 1;
  }
}
