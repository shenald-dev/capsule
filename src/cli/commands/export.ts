import path from 'node:path';
import { exportIncidentBundle, importIncidentBundle } from '../../core/storage.js';
import { theme } from '../../utils/theme.js';

export function exportCommandAction(id?: string, options: { output?: string } = {}): void {
  try {
    const target = id || 'latest';
    const savedPath = exportIncidentBundle(target, options.output);
    console.log(`\n ${theme.symbols.check} ${theme.success('Incident bundle exported successfully!')}`);
    console.log(`   ${theme.dim('Path:')} ${theme.code(path.resolve(savedPath))}\n`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n${theme.symbols.cross} ${theme.error(error.message)}\n`);
    process.exitCode = 1;
  }
}

export function importCommandAction(filePath: string): void {
  try {
    const capsule = importIncidentBundle(filePath);
    console.log(`\n ${theme.symbols.check} ${theme.success(`Imported incident bundle '${capsule.id}'`)}`);
    console.log(`   ${theme.dim('Command:')} ${theme.white(capsule.command)} ${theme.dim(`(Exit ${capsule.exitCode})`)}`);
    console.log(`   ${theme.dim('Run:')} ${theme.code(`capsule replay ${capsule.id}`)} ${theme.dim('to reproduce.')}\n`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`\n${theme.symbols.cross} ${theme.error(error.message)}\n`);
    process.exitCode = 1;
  }
}
