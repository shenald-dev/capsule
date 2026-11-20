import { loadIncident } from '../../core/storage.js';
import { copyToClipboard } from '../../platform/clipboard.js';
import { formatPrompt } from '../../core/prompts.js';
import { theme } from '../../utils/theme.js';
import type { PromptFormat } from '../../types.js';

export function copyCommandAction(id?: string, options: { format?: PromptFormat } = {}): void {
  try {
    const target = id || 'latest';
    const capsule = loadIncident(target);
    const content = options.format ? formatPrompt(capsule, options.format) : capsule.aiPrompt;
    const copied = copyToClipboard(content);

    const fmtLabel = options.format ? ` (${options.format} format)` : '';
    if (copied) {
      console.log(`\n ${theme.symbols.check} ${theme.success(`Copied AI incident prompt for '${capsule.id}'${fmtLabel} to clipboard!`)}`);
      console.log(`   ${theme.dim('Paste directly into Claude, Cursor, ChatGPT, or your favorite AI agent.')}\n`);
    } else {
      console.warn(`\n ${theme.symbols.warn} ${theme.warning('Could not automatically access system clipboard.')}`);
      console.log(`   ${theme.dim('Printing incident prompt below:')}\n`);
      console.log(content);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n${theme.symbols.cross} ${theme.error(error.message)}\n`);
    process.exitCode = 1;
  }
}
