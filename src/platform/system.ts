import os from 'node:os';
import { execSync } from 'node:child_process';
import type { SystemSnapshot } from '../types.js';

function getCommandVersion(cmd: string): string | undefined {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 1000 });
    return output.trim().split('\n')[0];
  } catch (err: unknown) {
    const execErr = err as { stdout?: string | Buffer; stderr?: string | Buffer; status?: number };
    const errOutput = (execErr.stderr?.toString().trim() || execErr.stdout?.toString().trim() || '');
    const firstLine = errOutput.split('\n')[0]?.trim();

    if (
      !firstLine ||
      firstLine.includes('not recognized') ||
      firstLine.includes('not found') ||
      firstLine.includes('No such file')
    ) {
      return undefined;
    }

    // Java often writes version information to stderr while exiting with 0
    if (firstLine.includes('version') || firstLine.includes('openjdk') || firstLine.includes('Runtime')) {
      return firstLine;
    }

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
    goVersion: getCommandVersion('go version'),
    rustVersion: getCommandVersion('rustc --version'),
    javaVersion: getCommandVersion('java -version'),
    memory: {
      totalMb: Math.round(totalBytes / (1024 * 1024)),
      freeMb: Math.round(freeBytes / (1024 * 1024)),
      usedMb: Math.round(usedBytes / (1024 * 1024))
    },
    cpus: os.cpus().length
  };
}
