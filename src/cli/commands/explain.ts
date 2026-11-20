import { loadIncident } from '../../core/storage.js';
import { renderDetailedExplanation } from '../ui/banners.js';
import { theme } from '../../utils/theme.js';

export function explainCommandAction(id?: string): void {
  try {
    const target = id || 'latest';
    const capsule = loadIncident(target);
    renderDetailedExplanation(capsule);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n${theme.symbols.cross} ${theme.error(error.message)}\n`);
    process.exitCode = 1;
  }
}
