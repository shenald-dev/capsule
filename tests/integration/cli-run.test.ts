import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executeCommand } from '../../src/core/runner.js';
import { loadIncident } from '../../src/core/storage.js';

describe('CLI Integration Gauntlet', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-integration-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('runs a passing command cleanly with exit code 0', async () => {
    const result = await executeCommand(process.execPath, ['-e', 'console.log("Success payload")'], {
      silent: true,
      cwd: tempDir
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Success payload');
    expect(result.capsule).toBeUndefined();
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('traps a failing command, creates an incident capsule, and purifies the error', async () => {
    const result = await executeCommand(
      process.execPath,
      ['-e', 'throw new ReferenceError("UserSession is not defined")'],
      {
        silent: true,
        cwd: tempDir
      }
    );

    expect(result.exitCode).toBe(1);
    expect(result.capsule).toBeDefined();
    expect(result.capsule?.status).toBe('failed');
    expect(result.capsule?.rootCause.name).toBe('ReferenceError');
    expect(result.capsule?.rootCause.message).toBe('UserSession is not defined');

    // Verify persisted on disk
    const latest = loadIncident('latest', tempDir);
    expect(latest.id).toBe(result.capsule?.id);
    expect(latest.rootCause.name).toBe('ReferenceError');

    const mdPath = path.join(tempDir, '.capsule', 'incidents', 'latest.md');
    expect(fs.existsSync(mdPath)).toBe(true);
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    expect(mdContent).toContain('UserSession is not defined');
  });

  it('handles non-existent binaries with exit code 127', async () => {
    const result = await executeCommand('non_existent_binary_xyz_12345', [], {
      silent: true,
      cwd: tempDir
    });

    expect(result.exitCode).toBe(127);
    expect(result.capsule).toBeDefined();
    expect(result.capsule?.exitCode).toBe(127);
  });
});
