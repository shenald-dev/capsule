import { captureSystemSnapshot } from '../platform/system.js';
import { captureGitSnapshot } from '../platform/git.js';
import { redactEnvironment } from './redactor.js';
import { purifyErrorOutput } from './purifier/index.js';
import { analyzeRemedy } from './analyzer.js';
import { formatPrompt, buildMarkdownPrompt } from './prompts.js';
import type { IncidentCapsule, OutputSnapshot, PromptFormat } from '../types.js';

export function generateIncidentId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 6);
  return `inc_${dateStr}_${rand}`;
}

export function buildAiPrompt(capsule: Omit<IncidentCapsule, 'aiPrompt'>, format: PromptFormat = 'markdown'): string {
  return formatPrompt(capsule, format);
}

export function createIncidentCapsule(params: {
  command: string;
  args: string[];
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  cwd?: string;
  exitSignal?: string;
  format?: PromptFormat;
}): IncidentCapsule {
  const { command, args, exitCode, durationMs, stdout, stderr, cwd, exitSignal, format = 'markdown' } = params;
  const id = generateIncidentId();
  const timestamp = new Date().toISOString();
  const combined = `${stdout}\n${stderr}`.trim();

  const totalLines = combined.split('\n').length;
  const totalBytes = Buffer.byteLength(combined, 'utf8');
  const MAX_OUTPUT_CHARS = 100_000;
  const truncated = combined.length > MAX_OUTPUT_CHARS;
  const safeOutput = truncated ? combined.slice(0, MAX_OUTPUT_CHARS) + '\n... [TRUNCATED BY CAPSULE]' : combined;

  const output: OutputSnapshot = {
    stdout,
    stderr,
    combined: safeOutput,
    truncated,
    totalLines,
    totalBytes,
    exitSignal
  };

  const rootCause = purifyErrorOutput(combined);
  const remedy = analyzeRemedy(rootCause, exitCode, combined);
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
    remedy,
    system,
    git,
    environment,
    output
  };

  const aiPrompt = buildAiPrompt(baseCapsule, format);

  return {
    ...baseCapsule,
    aiPrompt
  };
}
