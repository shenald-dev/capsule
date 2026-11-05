import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  saveIncident,
  loadIncident,
  listIncidents,
  cleanIncidents,
  getCapsuleDir
} from '../../src/core/storage.js';
import { createIncidentCapsule } from '../../src/core/snapshot.js';

describe('Storage Engine (.capsule/)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('saves and loads an incident capsule deterministically', () => {
    const capsule = createIncidentCapsule({
      command: 'pytest',
      args: ['-k', 'test_auth'],
      exitCode: 1,
      durationMs: 320,
      stdout: '',
      stderr: 'AssertionError: assert False',
      cwd: tempDir
    });

    const { jsonPath, mdPath } = saveIncident(capsule, tempDir);

    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);

    const loaded = loadIncident(capsule.id, tempDir);
    expect(loaded.id).toBe(capsule.id);
    expect(loaded.exitCode).toBe(1);
    expect(loaded.command).toBe('pytest');

    const latest = loadIncident('latest', tempDir);
    expect(latest.id).toBe(capsule.id);
  });

  it('lists incidents sorted by timestamp descending', () => {
    const c1 = createIncidentCapsule({
      command: 'cmd1',
      args: [],
      exitCode: 1,
      durationMs: 100,
      stdout: '',
      stderr: 'err1',
      cwd: tempDir
    });
    c1.id = 'inc_20261106_000001_aaaa';

    const c2 = createIncidentCapsule({
      command: 'cmd2',
      args: [],
      exitCode: 2,
      durationMs: 200,
      stdout: '',
      stderr: 'err2',
      cwd: tempDir
    });
    c2.id = 'inc_20261106_000002_bbbb';

    saveIncident(c1, tempDir);
    saveIncident(c2, tempDir);

    const list = listIncidents(10, tempDir);
    expect(list.length).toBe(2);
    expect(list[0].id).toBe(c2.id); // Latest first
    expect(list[1].id).toBe(c1.id);
  });

  it('cleans incidents while preserving specified count', () => {
    for (let i = 1; i <= 6; i++) {
      const c = createIncidentCapsule({
        command: `cmd${i}`,
        args: [],
        exitCode: 1,
        durationMs: 100,
        stdout: '',
        stderr: 'err',
        cwd: tempDir
      });
      c.id = `inc_20261106_00000${i}_xxxx`;
      saveIncident(c, tempDir);
    }

    expect(listIncidents(10, tempDir).length).toBe(6);

    const deleted = cleanIncidents({ keepLast: 3 }, tempDir);
    expect(deleted).toBe(3);
    expect(listIncidents(10, tempDir).length).toBe(3);
  });
});
