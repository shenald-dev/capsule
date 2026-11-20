import type { IncidentCapsule, PromptFormat } from '../types.js';

export function buildMarkdownPrompt(capsule: Omit<IncidentCapsule, 'aiPrompt'>): string {
  const { command, exitCode, durationMs, rootCause, remedy, git, system } = capsule;

  const sections: string[] = [
    `# Incident Report: \`${command}\` (Exit Code ${exitCode})`,
    '',
    `**Timestamp:** ${capsule.timestamp}`,
    `**Execution Duration:** ${durationMs}ms`,
    `**Operating System:** ${system.platform} (${system.arch}, ${system.osRelease})`,
    `**Node:** ${system.nodeVersion}${system.pythonVersion ? ` | **Python:** ${system.pythonVersion}` : ''}${system.goVersion ? ` | **Go:** ${system.goVersion}` : ''}`,
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

  if (remedy) {
    sections.push(
      '',
      `### Heuristic Diagnostic Hint:`,
      `> **[${remedy.category}]** ${remedy.summary}`,
      `> ${remedy.suggestion}`,
      remedy.commandHint ? `> **Action:** \`${remedy.commandHint}\`` : ''
    );
  }

  if (rootCause.codeSnippet) {
    sections.push('', '### Failing Code Frame:', '```text', rootCause.codeSnippet, '```');
  }

  if (rootCause.purifiedFrames.length > 0) {
    sections.push(
      '',
      '### Purified Stacktrace (Application Frames Only):',
      '```text',
      rootCause.purifiedFrames
        .map((f) => `  at ${f.functionName || '<anonymous>'} (${f.file}:${f.line ?? '?'}:${f.column ?? '?'})`)
        .join('\n'),
      '```'
    );
  }

  const logSnippet = (capsule.output.stderr || capsule.output.stdout).trim();
  const trimmedLog = logSnippet.length > 2500 ? logSnippet.slice(-2500) : logSnippet;

  sections.push(
    '',
    `## Raw Error Log Snippet (Tail):`,
    '```text',
    trimmedLog || 'No error output recorded.',
    '```',
    '',
    `## Task for AI Assistant:`,
    `Review this deterministic failure capsule. Explain the exact bug triggering \`${rootCause.name}: ${rootCause.message}\`, and provide the minimal drop-in code fix.`
  );

  return sections.filter((s) => s !== '').join('\n');
}

export function buildClaudePrompt(capsule: Omit<IncidentCapsule, 'aiPrompt'>): string {
  const { command, exitCode, durationMs, rootCause, remedy, git, system } = capsule;
  const logSnippet = (capsule.output.stderr || capsule.output.stdout).trim().slice(-2500);

  return [
    `<incident_report version="2.0" id="${capsule.id}">`,
    `  <metadata command="${command}" exit_code="${exitCode}" duration_ms="${durationMs}" timestamp="${capsule.timestamp}" />`,
    `  <environment platform="${system.platform}" arch="${system.arch}" node="${system.nodeVersion}" git_branch="${git.branch || 'none'}" is_dirty="${git.isDirty ?? false}" />`,
    `  <root_cause engine="${rootCause.engine}" type="${rootCause.name}" location="${rootCause.file || 'unknown'}:${rootCause.line ?? '?'}:${rootCause.column ?? '?'}">`,
    `    <![CDATA[${rootCause.message}]]>`,
    `  </root_cause>`,
    remedy ? `  <heuristic_remedy category="${remedy.category}" summary="${remedy.summary}" command="${remedy.commandHint || ''}" />` : '',
    rootCause.codeSnippet ? `  <failing_code_frame>\n<![CDATA[\n${rootCause.codeSnippet}\n]]>\n  </failing_code_frame>` : '',
    git.diffSnippet ? `  <git_diff>\n<![CDATA[\n${git.diffSnippet}\n]]>\n  </git_diff>` : '',
    `  <terminal_tail>\n<![CDATA[\n${logSnippet}\n]]>\n  </terminal_tail>`,
    `  <task>`,
    `    Diagnose why \`${command}\` failed with ${rootCause.name}. Provide a surgical, minimal fix targeting the failing line.`,
    `  </task>`,
    `</incident_report>`
  ].filter(Boolean).join('\n');
}

export function buildChatGptPrompt(capsule: Omit<IncidentCapsule, 'aiPrompt'>): string {
  const md = buildMarkdownPrompt(capsule);
  return JSON.stringify(
    {
      messages: [
        {
          role: 'system',
          content: 'You are an autonomous principal software engineer. Analyze terminal incident capsules, find root causes, and provide minimal fixes.'
        },
        {
          role: 'user',
          content: md
        }
      ]
    },
    null,
    2
  );
}

export function buildGitHubIssuePrompt(capsule: Omit<IncidentCapsule, 'aiPrompt'>): string {
  const { command, exitCode, durationMs, rootCause, remedy, git, system } = capsule;
  const logSnippet = (capsule.output.stderr || capsule.output.stdout).trim().slice(-3000);

  const sections: string[] = [
    `### 💥 Incident Report: \`${command}\` (Exit Code ${exitCode})`,
    '',
    `| Field | Value |`,
    `|---|---|`,
    `| **Command** | \`${command}\` |`,
    `| **Exit Code** | \`${exitCode}\` |`,
    `| **Duration** | \`${durationMs}ms\` |`,
    `| **Environment** | \`${system.platform} (${system.arch})\` • Node \`${system.nodeVersion}\` |`,
    `| **Git Branch** | \`${git.branch || 'detached'}\` (Dirty: \`${git.isDirty ? 'yes' : 'no'}\`) |`,
    '',
    `#### 📍 Root Cause: \`${rootCause.name}\``,
    `> **${rootCause.message}**`,
    rootCause.file ? `> Location: \`${rootCause.file}:${rootCause.line ?? '?'}:${rootCause.column ?? '?'}\`` : ''
  ];

  if (remedy) {
    sections.push(
      '',
      `**Suggested Remedy:** ${remedy.summary}`,
      remedy.commandHint ? `\`\`\`bash\n${remedy.commandHint}\n\`\`\`` : ''
    );
  }

  if (rootCause.codeSnippet) {
    sections.push(
      '',
      '<details><summary>🔍 Failing Code Frame</summary>',
      '',
      '```text',
      rootCause.codeSnippet,
      '```',
      '</details>'
    );
  }

  if (git.diffSnippet) {
    sections.push(
      '',
      '<details><summary>📝 Uncommitted Git Changes</summary>',
      '',
      '```diff',
      git.diffSnippet,
      '```',
      '</details>'
    );
  }

  sections.push(
    '',
    '<details><summary>📜 Terminal Log Tail</summary>',
    '',
    '```text',
    logSnippet || 'No error log recorded.',
    '```',
    '</details>',
    '',
    `*Generated automatically by [@shenald/capsule](https://github.com/shenald-dev/capsule) flight recorder.*`
  );

  return sections.filter(Boolean).join('\n');
}

export function formatPrompt(capsule: Omit<IncidentCapsule, 'aiPrompt'>, format: PromptFormat = 'markdown'): string {
  switch (format) {
    case 'claude':
      return buildClaudePrompt(capsule);
    case 'chatgpt':
      return buildChatGptPrompt(capsule);
    case 'github':
      return buildGitHubIssuePrompt(capsule);
    case 'markdown':
    default:
      return buildMarkdownPrompt(capsule);
  }
}
