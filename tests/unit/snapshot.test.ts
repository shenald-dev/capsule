import { describe, it, expect } from 'vitest';
import { generateIncidentId, buildAiPrompt, createIncidentCapsule } from '../../src/core/snapshot.js';

describe('Snapshot & Incident Capsule Generator', () => {
  it('generates unique formatted incident IDs', () => {
    const id1 = generateIncidentId();
    const id2 = generateIncidentId();
    expect(id1).toMatch(/^inc_\d{8}_\d{6}_[a-z0-9]{4}$/);
    expect(id1).not.toBe(id2);
  });

  it('creates an incident capsule with full environmental snapshot', () => {
    const capsule = createIncidentCapsule({
      command: 'node',
      args: ['-e', 'throw new Error("Boom")'],
      exitCode: 1,
      durationMs: 120,
      stdout: '',
      stderr: 'Error: Boom\n    at [eval]:1:7'
    });

    expect(capsule.id).toBeDefined();
    expect(capsule.exitCode).toBe(1);
    expect(capsule.durationMs).toBe(120);
    expect(capsule.status).toBe('failed');
    expect(capsule.rootCause.name).toBe('Error');
    expect(capsule.rootCause.message).toBe('Boom');
    expect(capsule.system.platform).toBe(process.platform);
    expect(capsule.aiPrompt).toContain('# Incident Report: `node` (Exit Code 1)');
  });

  it('builds an actionable AI prompt containing git and root cause sections', () => {
    const prompt = buildAiPrompt({
      id: 'inc_test_123',
      timestamp: '2026-11-06T00:00:00.000Z',
      command: 'npm run test',
      args: [],
      exitCode: 1,
      durationMs: 450,
      status: 'failed',
      rootCause: {
        engine: 'v8',
        name: 'TypeError',
        message: 'Cannot read properties of undefined',
        file: 'src/index.ts',
        line: 12,
        column: 4,
        purifiedFrames: [{ file: 'src/index.ts', line: 12, column: 4, isInternal: false }],
        rawTraceback: 'TypeError: Cannot read properties of undefined'
      },
      system: {
        platform: 'win32',
        arch: 'x64',
        osRelease: '10.0',
        nodeVersion: 'v22.0.0',
        memory: { totalMb: 16000, freeMb: 8000, usedMb: 8000 },
        cpus: 8
      },
      git: {
        isRepo: true,
        branch: 'main',
        commitHash: 'abc1234',
        isDirty: true,
        diffSummary: ' 1 file changed, 2 insertions(+)'
      },
      environment: { NODE_ENV: 'test' },
      output: {
        stdout: '',
        stderr: 'TypeError: Cannot read properties of undefined',
        combined: 'TypeError: Cannot read properties of undefined',
        truncated: false,
        totalLines: 1
      }
    });

    expect(prompt).toContain('## Git Context');
    expect(prompt).toContain('`main`');
    expect(prompt).toContain('## Purified Root Cause');
    expect(prompt).toContain('`src/index.ts:12:4`');
    expect(prompt).toContain('## Task for AI Assistant');
  });
});
