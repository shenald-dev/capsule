import fs from 'node:fs';
import path from 'node:path';
import type { IncidentCapsule } from '../types.js';
import { IncidentNotFoundError } from '../utils/errors.js';

export function getCapsuleDir(cwd: string = process.cwd()): string {
  return path.join(cwd, '.capsule');
}

export function getIncidentsDir(cwd: string = process.cwd()): string {
  return path.join(getCapsuleDir(cwd), 'incidents');
}

export function ensureCapsuleDirs(cwd: string = process.cwd()): void {
  const incidentsDir = getIncidentsDir(cwd);
  if (!fs.existsSync(incidentsDir)) {
    fs.mkdirSync(incidentsDir, { recursive: true });
  }
}

export function saveIncident(
  capsule: IncidentCapsule,
  cwd: string = process.cwd()
): { jsonPath: string; mdPath: string } {
  ensureCapsuleDirs(cwd);
  const incidentsDir = getIncidentsDir(cwd);

  const jsonPath = path.join(incidentsDir, `${capsule.id}.json`);
  const mdPath = path.join(incidentsDir, `${capsule.id}.md`);
  const latestJsonPath = path.join(incidentsDir, 'latest.json');
  const latestMdPath = path.join(incidentsDir, 'latest.md');

  const jsonContent = JSON.stringify(capsule, null, 2);
  fs.writeFileSync(jsonPath, jsonContent, 'utf8');
  fs.writeFileSync(mdPath, capsule.aiPrompt, 'utf8');

  // Also write/update latest pointers (cross-platform safe copy)
  fs.writeFileSync(latestJsonPath, jsonContent, 'utf8');
  fs.writeFileSync(latestMdPath, capsule.aiPrompt, 'utf8');

  return { jsonPath, mdPath };
}

export function loadIncident(idOrLatest: string = 'latest', cwd: string = process.cwd()): IncidentCapsule {
  const incidentsDir = getIncidentsDir(cwd);
  const targetName = idOrLatest.endsWith('.json') ? idOrLatest : `${idOrLatest}.json`;
  const filePath = path.join(incidentsDir, targetName);

  if (!fs.existsSync(filePath)) {
    throw new IncidentNotFoundError(idOrLatest);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as IncidentCapsule;
}

export function listIncidents(limit: number = 10, cwd: string = process.cwd()): IncidentCapsule[] {
  const incidentsDir = getIncidentsDir(cwd);
  if (!fs.existsSync(incidentsDir)) return [];

  const files = fs
    .readdirSync(incidentsDir)
    .filter((f) => f.startsWith('inc_') && f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit);

  const incidents: IncidentCapsule[] = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(incidentsDir, file), 'utf8');
      incidents.push(JSON.parse(content) as IncidentCapsule);
    } catch {
      // Ignore corrupted files
    }
  }

  return incidents;
}

export interface SearchIncidentsOptions {
  query?: string;
  status?: 'failed' | 'success';
  exitCode?: number;
  limit?: number;
}

export function searchIncidents(options: SearchIncidentsOptions = {}, cwd: string = process.cwd()): IncidentCapsule[] {
  const incidentsDir = getIncidentsDir(cwd);
  if (!fs.existsSync(incidentsDir)) return [];

  const files = fs
    .readdirSync(incidentsDir)
    .filter((f) => f.startsWith('inc_') && f.endsWith('.json'))
    .sort()
    .reverse();

  const results: IncidentCapsule[] = [];
  const limit = options.limit ?? 20;
  const q = options.query?.toLowerCase();

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(incidentsDir, file), 'utf8');
      const inc = JSON.parse(content) as IncidentCapsule;

      if (options.status && inc.status !== options.status) {
        continue;
      }
      if (options.exitCode !== undefined && inc.exitCode !== options.exitCode) {
        continue;
      }
      if (q) {
        const text = `${inc.command} ${inc.args.join(' ')} ${inc.rootCause.name} ${inc.rootCause.message} ${inc.id}`.toLowerCase();
        if (!text.includes(q)) {
          continue;
        }
      }

      results.push(inc);
      if (results.length >= limit) break;
    } catch {
      // Ignore corrupted files
    }
  }

  return results;
}

export function exportIncidentBundle(
  idOrLatest: string = 'latest',
  outputPath?: string,
  cwd: string = process.cwd()
): string {
  const capsule = loadIncident(idOrLatest, cwd);
  const targetPath = outputPath || path.join(cwd, `${capsule.id}.bundle.json`);
  fs.writeFileSync(targetPath, JSON.stringify(capsule, null, 2), 'utf8');
  return targetPath;
}

export function importIncidentBundle(bundlePath: string, cwd: string = process.cwd()): IncidentCapsule {
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Bundle file not found at: ${bundlePath}`);
  }

  const raw = fs.readFileSync(bundlePath, 'utf8');
  const capsule = JSON.parse(raw) as IncidentCapsule;

  if (!capsule.id || !capsule.command || typeof capsule.exitCode !== 'number') {
    throw new Error('Invalid incident bundle structure.');
  }

  saveIncident(capsule, cwd);
  return capsule;
}

export function cleanIncidents(options: { keepLast?: number; all?: boolean }, cwd: string = process.cwd()): number {
  const incidentsDir = getIncidentsDir(cwd);
  if (!fs.existsSync(incidentsDir)) return 0;

  const files = fs.readdirSync(incidentsDir).filter((f) => f.endsWith('.json') || f.endsWith('.md'));

  if (options.all) {
    let count = 0;
    for (const f of files) {
      fs.unlinkSync(path.join(incidentsDir, f));
      count++;
    }
    return count;
  }

  const keepLast = options.keepLast ?? 5;
  const jsonFiles = files.filter((f) => f.startsWith('inc_') && f.endsWith('.json')).sort().reverse();

  const toDelete = jsonFiles.slice(keepLast);
  let deletedCount = 0;

  for (const jsonFile of toDelete) {
    const baseId = path.basename(jsonFile, '.json');
    const mdFile = `${baseId}.md`;

    let fileRemoved = false;
    try {
      fs.unlinkSync(path.join(incidentsDir, jsonFile));
      fileRemoved = true;
    } catch {
      // Ignore
    }

    try {
      fs.unlinkSync(path.join(incidentsDir, mdFile));
      fileRemoved = true;
    } catch {
      // Ignore
    }

    if (fileRemoved) {
      deletedCount++;
    }
  }

  return deletedCount;
}
