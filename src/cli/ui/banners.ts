import { theme } from '../../utils/theme.js';
import { formatDuration } from '../../utils/formatters.js';
import type { IncidentCapsule } from '../../types.js';

export function renderHeader(): void {
  console.log(theme.brand(`\n  ${theme.symbols.capsule} capsule v0.1.0`) + theme.dim(' — Terminal Command Flight Recorder\n'));
}

export function renderSuccess(durationMs: number): void {
  console.log(
    `\n${theme.symbols.check} ${theme.success('Command completed successfully')} ${theme.dim(`(${formatDuration(durationMs)})`)}\n`
  );
}

export function renderTriageCard(capsule: IncidentCapsule, savedPath?: { jsonPath: string; mdPath: string }): void {
  const { command, exitCode, durationMs, rootCause } = capsule;

  console.log('\n' + theme.dim('═'.repeat(68)));
  console.log(
    ` ${theme.symbols.fire} ${theme.error('COMMAND FAILED')}  ${theme.dim('│')}  ${theme.white(command)}`
  );
  console.log(
    ` ${theme.dim('Status:')} ${theme.highlight(`Exit ${exitCode}`)}  ${theme.dim('│')}  ${theme.symbols.clock} ${theme.dim(formatDuration(durationMs))}  ${theme.dim('│')}  ${theme.dim(capsule.id)}`
  );
  console.log(theme.dim('─'.repeat(68)));

  // Root cause block
  console.log(` ${theme.symbols.target} ${theme.bold('Root Cause:')} ${theme.error(rootCause.name)}: ${theme.white(rootCause.message)}`);
  
  if (rootCause.file) {
    const loc = `${rootCause.file}${rootCause.line ? `:${rootCause.line}` : ''}${rootCause.column ? `:${rootCause.column}` : ''}`;
    console.log(`   ${theme.dim('Location:')} ${theme.code(loc)}`);
  }

  if (rootCause.codeSnippet) {
    console.log('\n' + theme.dim('   ' + '─'.repeat(60)));
    const snippetLines = rootCause.codeSnippet.split('\n');
    for (const line of snippetLines) {
      if (line.startsWith(' > ')) {
        console.log(`   ${theme.error(line)}`);
      } else {
        console.log(`   ${theme.dim(line)}`);
      }
    }
    console.log(theme.dim('   ' + '─'.repeat(60)));
  }

  // Storage info
  if (savedPath) {
    console.log(`\n ${theme.symbols.capsule} ${theme.dim('Incident saved:')} ${theme.brandMuted('.capsule/incidents/latest.md')}`);
  }

  // Quick Action bar
  console.log(
    `\n ${theme.symbols.pointer} ${theme.dim('Quick Actions:')} ` +
      `${theme.code('capsule copy')} ${theme.dim('(AI prompt)')} │ ` +
      `${theme.code('capsule replay')} ${theme.dim('(rerun)')} │ ` +
      `${theme.code('capsule last --json')}`
  );
  console.log(theme.dim('═'.repeat(68)) + '\n');
}

export function renderIncidentTable(incidents: IncidentCapsule[]): void {
  if (incidents.length === 0) {
    console.log(`\n ${theme.symbols.info} No incidents recorded yet in .capsule/incidents/\n`);
    return;
  }

  console.log('\n' + theme.bold('  Recorded Incident Capsules:') + '\n');
  console.log(
    theme.dim(
      '  ' +
        'ID'.padEnd(26) +
        'EXIT'.padEnd(8) +
        'DURATION'.padEnd(12) +
        'COMMAND'.padEnd(22) +
        'ROOT CAUSE'
    )
  );
  console.log('  ' + theme.dim('─'.repeat(80)));

  for (const inc of incidents) {
    const idStr = inc.id.padEnd(26);
    const exitStr = inc.exitCode === 0 ? theme.success('0'.padEnd(8)) : theme.error(`${inc.exitCode}`.padEnd(8));
    const durStr = formatDuration(inc.durationMs).padEnd(12);
    const cmdStr = (inc.command.length > 20 ? inc.command.slice(0, 17) + '...' : inc.command).padEnd(22);
    const causeStr = inc.rootCause.name ? `${inc.rootCause.name}: ${inc.rootCause.message.slice(0, 25)}` : 'Unknown';

    console.log(`  ${theme.dim(idStr)}${exitStr}${theme.dim(durStr)}${theme.white(cmdStr)}${theme.dim(causeStr)}`);
  }
  console.log('');
}
