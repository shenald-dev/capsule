import { describe, it, expect } from 'vitest';
import {
  buildMarkdownPrompt,
  buildClaudePrompt,
  buildChatGptPrompt,
  buildGitHubIssuePrompt,
  formatPrompt
} from '../../src/core/prompts.js';
import type { IncidentCapsule } from '../../src/types.js';

describe('Multi-Format AI Prompt Generator', () => {
  const mockCapsule: Omit<IncidentCapsule, 'aiPrompt'> = {
    id: 'inc_20261120_120000_abcd',
    timestamp: '2026-11-20T12:00:00.000Z',
    command: 'npm run build',
    args: [],
    exitCode: 1,
    durationMs: 850,
    status: 'failed',
    rootCause: {
      engine: 'v8',
      name: 'TypeError',
      message: "Cannot read property 'id' of undefined",
      file: 'src/user.ts',
      line: 32,
      column: 10,
      codeSnippet: ' > 32 | return user.id;',
      purifiedFrames: [{ file: 'src/user.ts', line: 32, column: 10, functionName: 'getUser', isInternal: false }],
      rawTraceback: 'TypeError: Cannot read property...'
    },
    remedy: {
      category: 'NULL_POINTER',
      summary: 'Potential null dereference on user object',
      suggestion: 'Check if user is defined before accessing .id',
      confidence: 'high'
    },
    system: {
      platform: 'linux',
      arch: 'x64',
      osRelease: '5.15.0',
      nodeVersion: 'v20.10.0',
      memory: { totalMb: 16000, freeMb: 8000, usedMb: 8000 },
      cpus: 8
    },
    git: {
      isRepo: true,
      branch: 'feature/auth',
      commitHash: 'deadbeef',
      isDirty: true,
      diffSnippet: '+ return user.id;'
    },
    environment: { NODE_ENV: 'test' },
    output: {
      stdout: '',
      stderr: "TypeError: Cannot read property 'id' of undefined",
      combined: "TypeError: Cannot read property 'id' of undefined",
      truncated: false,
      totalLines: 1
    }
  };

  it('generates standard clean Markdown format', () => {
    const md = buildMarkdownPrompt(mockCapsule);
    expect(md).toContain('# Incident Report: `npm run build` (Exit Code 1)');
    expect(md).toContain('## Purified Root Cause');
    expect(md).toContain('Heuristic Diagnostic Hint');
    expect(md).toContain('`src/user.ts:32:10`');
  });

  it('generates Anthropic Claude XML tagged format', () => {
    const claude = buildClaudePrompt(mockCapsule);
    expect(claude).toContain('<incident_report version="2.0" id="inc_20261120_120000_abcd">');
    expect(claude).toContain('<metadata command="npm run build" exit_code="1"');
    expect(claude).toContain('<root_cause');
    expect(claude).toContain('<failing_code_frame>');
    expect(claude).toContain('</incident_report>');
  });

  it('generates structured OpenAI / ChatGPT JSON format', () => {
    const chatgpt = buildChatGptPrompt(mockCapsule);
    const parsed = JSON.parse(chatgpt);
    expect(parsed.messages).toBeDefined();
    expect(parsed.messages.length).toBe(2);
    expect(parsed.messages[0].role).toBe('system');
    expect(parsed.messages[1].role).toBe('user');
    expect(parsed.messages[1].content).toContain('# Incident Report');
  });

  it('generates GitHub Issue template with collapsible details', () => {
    const gh = buildGitHubIssuePrompt(mockCapsule);
    expect(gh).toContain('### 💥 Incident Report: `npm run build` (Exit Code 1)');
    expect(gh).toContain('<details><summary>🔍 Failing Code Frame</summary>');
    expect(gh).toContain('<details><summary>📜 Terminal Log Tail</summary>');
  });

  it('delegates to formatPrompt correctly', () => {
    const res = formatPrompt(mockCapsule, 'claude');
    expect(res).toContain('<incident_report');
  });
});
