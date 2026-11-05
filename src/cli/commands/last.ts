import { loadIncident } from '../../core/storage.js';
import { renderTriageCard } from '../ui/banners.js';
import { copyToClipboard } from '../../platform/clipboard.js';
import { theme } from '../../utils/theme.js';

export function lastCommandAction(options: {
  json?: boolean;
  markdown?: boolean;
  raw?: boolean;
  copy?: boolean;
}): void {
  try {
    const capsule = loadIncident('latest');

    if (options.json) {
      console.log(JSON.stringify(capsule, null, 2));
      return;
    }

    if (options.markdown) {
      console.log(capsule.aiPrompt);
      return;
    }

    if (options.raw) {
      console.log(capsule.output.combined);
      return;
    }

    renderTriageCard(capsule);

    if (options.copy) {
      const copied = copyToClipboard(capsule.aiPrompt);
      if (copied) {
        console.log(` ${theme.symbols.check} ${theme.success('AI prompt copied to clipboard!')}\n`);
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n${theme.symbols.cross} ${theme.error(error.message)}\n`);
    process.exitCode = 1;
  }
}
