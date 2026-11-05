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

export function saveIncident(capsule: IncidentCapsule, cwd: string = process.cwd()): { jsonPath: string; mdPath: string } {
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
