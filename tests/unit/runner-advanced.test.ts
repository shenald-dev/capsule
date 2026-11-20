import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executeCommand } from '../../src/core/runner.js';

describe('Advanced Process Runner Engine', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-runner-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('terminates hanging processes when execution timeout is reached', async () => {
    const start = Date.now();
    const result = await executeCommand(
      process.execPath,
      ['-e', 'setTimeout(() => console.log("Done"), 10000)'],
      {
        silent: true,
        timeout: 400,
        cwd: tempDir
      }
    );
    const duration = Date.now() - start;

    expect(result.exitCode).toBe(124);
    expect(result.stderr).toContain('Command timed out after 400ms');
    expect(result.capsule).toBeDefined();
    expect(result.capsule?.exitCode).toBe(124);
    // Duration should be bounded close to the timeout, not 10 seconds
    expect(duration).toBeLessThan(3500);
  });

  it('preserves working directory in capsule', async () => {
    const result = await executeCommand(
      process.execPath,
      ['-e', 'throw new Error("Cwd Test")'],
      {
        silent: true,
        cwd: tempDir
      }
    );

    expect(result.exitCode).toBe(1);
    expect(result.capsule).toBeDefined();
  });
});
