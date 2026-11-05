import os from 'node:os';
import { execSync } from 'node:child_process';
import type { SystemSnapshot } from '../types.js';

function getCommandVersion(cmd: string): string | undefined {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 });
    return output.trim().split('\n')[0];
  } catch {
    return undefined;
  }
}

export function captureSystemSnapshot(): SystemSnapshot {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = totalBytes - freeBytes;

  return {
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    nodeVersion: process.version,
    pythonVersion: getCommandVersion('python --version') ?? getCommandVersion('python3 --version'),
    gitVersion: getCommandVersion('git --version'),
    memory: {
      totalMb: Math.round(totalBytes / (1024 * 1024)),
      freeMb: Math.round(freeBytes / (1024 * 1024)),
      usedMb: Math.round(usedBytes / (1024 * 1024))
    },
    cpus: os.cpus().length
  };
}
