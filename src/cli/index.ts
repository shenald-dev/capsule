import { Command } from 'commander';
import { runCommandAction } from './commands/run.js';
import { lastCommandAction } from './commands/last.js';
import { replayCommandAction } from './commands/replay.js';
import { copyCommandAction } from './commands/copy.js';
import { listCommandAction } from './commands/list.js';
import { cleanCommandAction } from './commands/clean.js';
import { doctorCommandAction } from './commands/doctor.js';
import { explainCommandAction } from './commands/explain.js';
import { exportCommandAction, importCommandAction } from './commands/export.js';
import { theme } from '../utils/theme.js';
import type { PromptFormat } from '../types.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('capsule')
    .description('The flight recorder for terminal commands. Instant incident capsules for humans & AI.')
    .version('0.2.0', '-v, --version', 'Output the current version of capsule');

  program
    .command('run', { isDefault: true })
    .description('Execute a command under the flight recorder')
    .argument('<command...>', 'The command and arguments to execute')
    .option('-q, --quiet', 'Suppress execution summary on success')
    .option('-s, --silent', 'Suppress child process output')
    .option('-c, --copy', 'Automatically copy AI prompt to clipboard on failure')
    .option('-t, --timeout <number>', 'Timeout in milliseconds before terminating child process')
    .option('-f, --format <format>', 'AI prompt format (markdown, claude, chatgpt, github)', 'markdown')
    .option('--json', 'Output full incident capsule as JSON on failure')
    .allowUnknownOption(true)
    .action(async (commandArgs: string[], options) => {
      const timeout = options.timeout ? parseInt(options.timeout, 10) : undefined;
      const exitCode = await runCommandAction(commandArgs, {
        ...options,
        timeout,
        format: options.format as PromptFormat
      });
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });

  program
    .command('last')
    .description('Display the most recent incident capsule')
    .option('--json', 'Output raw incident JSON')
    .option('--markdown', 'Output formatted AI prompt in Markdown')
    .option('-f, --format <format>', 'Output AI prompt in specific format (markdown, claude, chatgpt, github)')
    .option('--raw', 'Output raw combined stdout/stderr log')
    .option('-c, --copy', 'Copy AI prompt to clipboard')
    .action((options) => {
      lastCommandAction({
        ...options,
        format: options.format as PromptFormat
      });
    });

  program
    .command('replay [id]')
    .description('Re-execute a recorded incident command to verify fixes')
    .option('-t, --timeout <number>', 'Execution timeout in milliseconds')
    .option('-q, --quiet', 'Suppress stdout during replay')
    .action(async (id?: string, options = {}) => {
      const timeout = options.timeout ? parseInt(options.timeout, 10) : undefined;
      const exitCode = await replayCommandAction(id, {
        timeout,
        quiet: options.quiet
      });
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });

  program
    .command('copy [id]')
    .description('Copy the AI-optimized prompt for an incident to the clipboard')
    .option('-f, --format <format>', 'Prompt format (markdown, claude, chatgpt, github)', 'markdown')
    .action((id?: string, options = {}) => {
      copyCommandAction(id, { format: options.format as PromptFormat });
    });

  program
    .command('explain [id]')
    .description('Show deep triage explanation with root cause, remedy hints, and git diff')
    .action((id?: string) => {
      explainCommandAction(id);
    });

  program
    .command('export [id]')
    .description('Export an incident as a standalone shareable bundle')
    .option('-o, --output <path>', 'Destination output path')
    .action((id?: string, options = {}) => {
      exportCommandAction(id, options);
    });

  program
    .command('import <file>')
    .description('Import an incident bundle into local storage')
    .action((file: string) => {
      importCommandAction(file);
    });

  program
    .command('list')
    .description('List recent incident capsules')
    .option('-l, --limit <number>', 'Number of incidents to display', '10')
    .option('-s, --search <query>', 'Filter incidents matching query string')
    .option('--status <status>', 'Filter by status: failed or success')
    .option('--exit-code <number>', 'Filter by numeric exit code')
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
const isDirectExecution =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('cli.js') ||
  process.argv[1]?.endsWith('cli.ts');

if (isDirectExecution) {
  const cli = createCli();
  cli.parseAsync(process.argv).catch((err: Error) => {
    console.error(`\n${theme.symbols.cross} ${theme.error(err.message)}\n`);
    process.exit(1);
  });
}
