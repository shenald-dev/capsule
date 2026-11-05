import { loadIncident } from '../../core/storage.js';
import { copyToClipboard } from '../../platform/clipboard.js';
import { theme } from '../../utils/theme.js';

export function copyCommandAction(id?: string): void {
  try {
    const target = id || 'latest';
    const capsule = loadIncident(target);
    const copied = copyToClipboard(capsule.aiPrompt);

    if (copied) {
      console.log(`\n ${theme.symbols.check} ${theme.success(`Copied AI incident prompt for '${capsule.id}' to clipboard!`)}`);
      console.log(`   ${theme.dim('Paste directly into Claude, Cursor, ChatGPT, or your favorite AI agent.')}\n`);
    } else {
      console.warn(`\n ${theme.symbols.warn} ${theme.warning('Could not automatically access system clipboard.')}`);
      console.log(`   ${theme.dim('Printing incident prompt below:')}\n`);
      console.log(capsule.aiPrompt);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n${theme.symbols.cross} ${theme.error(error.message)}\n`);
    process.exitCode = 1;
  }
}
