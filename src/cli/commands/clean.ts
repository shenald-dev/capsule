import { cleanIncidents } from '../../core/storage.js';
import { theme } from '../../utils/theme.js';

export function cleanCommandAction(options: { all?: boolean; keep?: string }): void {
  const keep = options.keep ? parseInt(options.keep, 10) : 5;
  const deleted = cleanIncidents({ all: options.all, keepLast: keep });

  if (deleted === 0) {
    console.log(`\n ${theme.symbols.info} Capsule storage is already clean. No files removed.\n`);
    return;
  }

  console.log(
    `\n ${theme.symbols.check} ${theme.success(`Cleaned ${deleted} incident files`)} ` +
      (options.all ? theme.dim('(all removed)') : theme.dim(`(kept last ${keep})`)) +
      '\n'
  );
}
