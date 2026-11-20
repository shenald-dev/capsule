import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCommandAction } from '../../src/cli/commands/run.js';
import { lastCommandAction } from '../../src/cli/commands/last.js';
import { explainCommandAction } from '../../src/cli/commands/explain.js';
import { exportCommandAction, importCommandAction } from '../../src/cli/commands/export.js';
import { createIncidentCapsule } from '../../src/core/snapshot.js';
import { saveIncident } from '../../src/core/storage.js';

describe('CLI Advanced Commands Integration', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-cli-advanced-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('executes run with timeout and reports exit code 124', async () => {
    const exitCode = await runCommandAction(
      [process.execPath, '-e', 'setTimeout(() => {}, 10000)'],
      {
        silent: true,
        timeout: 300,
        cwd: tempDir
      }
    );

    expect(exitCode).toBe(124);
  });

  it('executes last with --format claude', () => {
    const capsule = createIncidentCapsule({
      command: 'test-command',
      args: [],
      exitCode: 1,
      durationMs: 100,
      stdout: '',
      stderr: 'Error: Sample failure',
      cwd: tempDir
    });
    saveIncident(capsule, tempDir);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      lastCommandAction({ format: 'claude' });
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('<incident_report');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('executes last with --format claude and --copy together', () => {
    const capsule = createIncidentCapsule({
      command: 'test-command',
      args: [],
      exitCode: 1,
      durationMs: 100,
      stdout: '',
      stderr: 'Error: Sample failure',
      cwd: tempDir
    });
    saveIncident(capsule, tempDir);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      lastCommandAction({ format: 'claude', copy: true });
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('<incident_report');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('executes explain command cleanly without crash', () => {
    const capsule = createIncidentCapsule({
      command: 'npm run build',
      args: [],
      exitCode: 1,
      durationMs: 120,
      stdout: '',
      stderr: 'TypeError: Cannot read properties of undefined\n    at Object.test (app.js:10:5)',
      cwd: tempDir
    });
    saveIncident(capsule, tempDir);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      explainCommandAction();
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('exports and imports bundle via CLI commands', () => {
    const capsule = createIncidentCapsule({
      command: 'python test.py',
      args: [],
      exitCode: 1,
      durationMs: 150,
      stdout: '',
      stderr: 'ZeroDivisionError: division by zero',
      cwd: tempDir
    });
    saveIncident(capsule, tempDir);

    const bundlePath = path.join(tempDir, 'my.bundle.json');
    exportCommandAction(capsule.id, { output: bundlePath });
    expect(fs.existsSync(bundlePath)).toBe(true);

    importCommandAction(bundlePath);
    expect(fs.existsSync(bundlePath)).toBe(true);
  });
});
