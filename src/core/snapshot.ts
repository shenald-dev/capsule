import { captureSystemSnapshot } from '../platform/system.js';
import { captureGitSnapshot } from '../platform/git.js';
import { redactEnvironment } from './redactor.js';
import { purifyErrorOutput } from './purifier/index.js';
import type { IncidentCapsule, OutputSnapshot } from '../types.js';

export function generateIncidentId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 6);
  return `inc_${dateStr}_${rand}`;
}

export function buildAiPrompt(capsule: Omit<IncidentCapsule, 'aiPrompt'>): string {
  const { command, exitCode, durationMs, rootCause, git, system } = capsule;

  const sections: string[] = [
    `# Incident Report: \`${command}\` (Exit Code ${exitCode})`,
    '',
    `**Timestamp:** ${capsule.timestamp}`,
    `**Execution Duration:** ${durationMs}ms`,
    `**Operating System:** ${system.platform} (${system.arch}, ${system.osRelease})`,
    `**Node:** ${system.nodeVersion}${system.pythonVersion ? ` | **Python:** ${system.pythonVersion}` : ''}`,
    ''
  ];

  if (git.isRepo) {
    sections.push(
      `## Git Context`,
      `- **Branch:** \`${git.branch || 'unknown'}\``,
      `- **Commit:** \`${git.commitHash || 'none'}\` - ${git.commitMessage || ''}`,
      `- **Working Tree Dirty:** ${git.isDirty ? 'Yes (uncommitted changes)' : 'No'}`
    );
    if (git.diffSummary) {
      sections.push('```text', git.diffSummary, '```');
    }
    if (git.diffSnippet) {
      sections.push('', '### Uncommitted Changes (Sample Diff):', '```diff', git.diffSnippet, '```');
    }
    sections.push('');
  }

  sections.push(
    `## Purified Root Cause`,
    `- **Type:** \`${rootCause.name}\``,
    `- **Message:** ${rootCause.message}`,
    rootCause.file ? `- **Location:** \`${rootCause.file}:${rootCause.line ?? '?'}:${rootCause.column ?? '?'}\`` : ''
  );

  if (rootCause.codeSnippet) {
    sections.push('', '### Failing Code Frame:', '```typescript', rootCause.codeSnippet, '```');
  }

  if (rootCause.purifiedFrames.length > 0) {
    sections.push(
      '',
      '### Purified Stacktrace (Application Frames Only):',
      '```text',
      rootCause.purifiedFrames
        .map((f) => `  at ${f.functionName || '<anonymous>'} (${f.file}:${f.line}:${f.column})`)
        .join('\n'),
      '```'
    );
  }

  sections.push(
    '',
    `## Raw Error Log Snippet (Tail):`,
    '```text',
    capsule.output.stderr || capsule.output.stdout.slice(-1500),
    '```',
    '',
    `## Task for AI Assistant:`,
    `Review this deterministic failure capsule. Explain the exact bug triggering \`${rootCause.name}: ${rootCause.message}\`, and provide the minimal drop-in code fix.`
  );

  return sections.filter((s) => s !== '').join('\n');
}

export function createIncidentCapsule(params: {
  command: string;
  args: string[];
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  cwd?: string;
}): IncidentCapsule {
  const { command, args, exitCode, durationMs, stdout, stderr, cwd } = params;
  const id = generateIncidentId();
  const timestamp = new Date().toISOString();
  const combined = `${stdout}\n${stderr}`.trim();

  const totalLines = combined.split('\n').length;
  const MAX_OUTPUT_CHARS = 100_000;
  const truncated = combined.length > MAX_OUTPUT_CHARS;
  const safeOutput = truncated ? combined.slice(0, MAX_OUTPUT_CHARS) + '\n... [TRUNCATED BY CAPSULE]' : combined;

  const output: OutputSnapshot = {
    stdout,
    stderr,
    combined: safeOutput,
    truncated,
    totalLines
  };

  const rootCause = purifyErrorOutput(combined);
  const system = captureSystemSnapshot();
  const git = captureGitSnapshot(cwd);
  const environment = redactEnvironment(process.env);

  const baseCapsule = {
    id,
    timestamp,
    command,
    args,
    exitCode,
    durationMs,
    status: (exitCode === 0 ? 'success' : 'failed') as 'success' | 'failed',
    rootCause,
    system,
    git,
    environment,
    output
  };

  const aiPrompt = buildAiPrompt(baseCapsule);

  return {
    ...baseCapsule,
    aiPrompt
  };
}
