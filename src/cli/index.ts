import { Command } from 'commander';
import { runCommandAction } from './commands/run.js';
import { lastCommandAction } from './commands/last.js';
import { replayCommandAction } from './commands/replay.js';
import { copyCommandAction } from './commands/copy.js';
import { listCommandAction } from './commands/list.js';
import { cleanCommandAction } from './commands/clean.js';
import { doctorCommandAction } from './commands/doctor.js';
import { theme } from '../utils/theme.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('capsule')
    .description('The flight recorder for terminal commands. Instant incident capsules for humans & AI.')
    .version('0.1.0', '-v, --version', 'Output the current version of capsule');

  program
    .command('run', { isDefault: true })
    .description('Execute a command under the flight recorder')
    .argument('<command...>', 'The command and arguments to execute')
    .option('-q, --quiet', 'Suppress execution summary on success')
    .option('-s, --silent', 'Suppress child process output')
    .option('-c, --copy', 'Automatically copy AI prompt to clipboard on failure')
    .option('--json', 'Output full incident capsule as JSON on failure')
    .allowUnknownOption(true)
    .action(async (commandArgs: string[], options) => {
      const exitCode = await runCommandAction(commandArgs, options);
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });

  program
    .command('last')
    .description('Display the most recent incident capsule')
    .option('--json', 'Output raw incident JSON')
    .option('--markdown', 'Output formatted AI prompt')
    .option('--raw', 'Output raw combined stdout/stderr log')
    .option('-c, --copy', 'Copy AI prompt to clipboard')
    .action((options) => {
      lastCommandAction(options);
    });

  program
    .command('replay [id]')
    .description('Re-execute a recorded incident command to verify fixes')
    .action(async (id?: string) => {
      const exitCode = await replayCommandAction(id);
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });

  program
    .command('copy [id]')
    .description('Copy the AI-optimized prompt for an incident to the clipboard')
    .action((id?: string) => {
      copyCommandAction(id);
    });

  program
    .command('list')
    .description('List recent incident capsules')
    .option('-l, --limit <number>', 'Number of incidents to display', '10')
    .option('--json', 'Output incidents list as JSON')
    .action((options) => {
      listCommandAction(options);
    });

  program
    .command('clean')
    .description('Prune old incident capsules from local storage')
    .option('--all', 'Delete all recorded incident capsules')
    .option('-k, --keep <number>', 'Number of latest incidents to preserve', '5')
    .action((options) => {
      cleanCommandAction(options);
    });

  program
    .command('doctor')
    .description('Run system diagnostic health checks')
    .action(() => {
      doctorCommandAction();
    });

  return program;
}

// Direct execution entry
const isDirectExecution = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('cli.ts');

if (isDirectExecution) {
  const cli = createCli();
  cli.parseAsync(process.argv).catch((err: Error) => {
    console.error(`\n${theme.symbols.cross} ${theme.error(err.message)}\n`);
    process.exit(1);
  });
}
