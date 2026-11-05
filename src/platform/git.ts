import { execSync } from 'node:child_process';
import type { GitSnapshot } from '../types.js';

function runGit(args: string, cwd?: string): string | null {
  try {
    return execSync(`git ${args}`, {
      cwd: cwd || process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    }).trim();
  } catch {
    return null;
  }
}

export function captureGitSnapshot(cwd?: string): GitSnapshot {
  const isRepoCheck = runGit('rev-parse --is-inside-work-tree', cwd);
  if (isRepoCheck !== 'true') {
    return { isRepo: false };
  }

  const branch = runGit('rev-parse --abbrev-ref HEAD', cwd) || undefined;
  const commitHash = runGit('rev-parse --short HEAD', cwd) || undefined;
  const commitMessage = runGit('log -1 --pretty=%B', cwd)?.split('\n')[0] || undefined;
  
  const statusOutput = runGit('status --porcelain', cwd) || '';
  const isDirty = statusOutput.length > 0;

  let diffSummary: string | undefined;
  let diffSnippet: string | undefined;

  if (isDirty) {
    diffSummary = runGit('diff --stat', cwd) || undefined;
    const rawDiff = runGit('diff -U1', cwd) || '';
    if (rawDiff) {
      // Keep first 50 lines of diff to avoid overwhelming context
      const lines = rawDiff.split('\n');
      diffSnippet = lines.slice(0, 50).join('\n');
      if (lines.length > 50) {
        diffSnippet += `\n... (${lines.length - 50} more lines omitted)`;
      }
    }
  }

  return {
    isRepo: true,
    branch,
    commitHash,
    commitMessage,
    isDirty,
    diffSummary,
    diffSnippet
  };
}
