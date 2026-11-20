import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  saveIncident,
  searchIncidents,
  exportIncidentBundle,
  importIncidentBundle
} from '../../src/core/storage.js';
import { createIncidentCapsule } from '../../src/core/snapshot.js';

describe('Storage Search & Bundle Engine', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-search-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('searches incidents by error name, query keyword, or status', () => {
    const c1 = createIncidentCapsule({
      command: 'npm run build',
      args: [],
      exitCode: 1,
      durationMs: 200,
      stdout: '',
      stderr: 'TypeError: Cannot read properties of undefined',
      cwd: tempDir
    });
    c1.id = 'inc_20261120_000001_aaaa';

    const c2 = createIncidentCapsule({
      command: 'pytest tests/',
      args: [],
      exitCode: 2,
      durationMs: 300,
      stdout: '',
      stderr: 'KeyError: user_not_found',
      cwd: tempDir
    });
    c2.id = 'inc_20261120_000002_bbbb';

    saveIncident(c1, tempDir);
    saveIncident(c2, tempDir);

    const typeErrorSearch = searchIncidents({ query: 'TypeError' }, tempDir);
    expect(typeErrorSearch.length).toBe(1);
    expect(typeErrorSearch[0].id).toBe(c1.id);

    const pytestSearch = searchIncidents({ query: 'pytest' }, tempDir);
    expect(pytestSearch.length).toBe(1);
    expect(pytestSearch[0].id).toBe(c2.id);

    const exit2Search = searchIncidents({ exitCode: 2 }, tempDir);
    expect(exit2Search.length).toBe(1);
    expect(exit2Search[0].id).toBe(c2.id);
  });

  it('exports and imports an incident bundle round-trip', () => {
    const original = createIncidentCapsule({
      command: 'cargo test',
      args: [],
      exitCode: 101,
      durationMs: 450,
      stdout: '',
      stderr: "thread 'main' panicked at 'assertion failed', src/lib.rs:12:5",
      cwd: tempDir
    });
    saveIncident(original, tempDir);

    const bundleFile = path.join(tempDir, 'export.bundle.json');
    const exportedPath = exportIncidentBundle(original.id, bundleFile, tempDir);
    expect(fs.existsSync(exportedPath)).toBe(true);

    const importDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-imported-'));
    try {
      const imported = importIncidentBundle(exportedPath, importDir);
      expect(imported.id).toBe(original.id);
      expect(imported.command).toBe('cargo test');
      expect(imported.exitCode).toBe(101);
    } finally {
      fs.rmSync(importDir, { recursive: true, force: true });
    }
  });
});
