import { execSync } from 'node:child_process';
import spawn from 'cross-spawn';
import type { ExecutionOptions, ExecutionResult } from '../types.js';
import { createIncidentCapsule } from './snapshot.js';
import { saveIncident } from './storage.js';

const MAX_BUFFER_CHARS = 2_000_000;

function killProcessTree(childPid?: number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): void {
  if (!childPid) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${childPid} /T /F`, { stdio: 'ignore' });
      return;
    } catch {
      // Fallback
    }
  }
  try {
    process.kill(childPid, signal);
  } catch {
    // Ignore
  }
}

export async function executeCommand(
  command: string,
  args: string[] = [],
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const startTime = process.hrtime.bigint();
  const cwd = options.cwd || process.cwd();

  return new Promise<ExecutionResult>((resolve) => {
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let settled = false;
    let timedOut = false;
    let timeoutTimer: NodeJS.Timeout | undefined;
    let killTimer: NodeJS.Timeout | undefined;

    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      const str = chunk.toString();
      if (stdoutBuffer.length < MAX_BUFFER_CHARS) {
        stdoutBuffer += str;
      }
      if (!options.silent) {
        process.stdout.write(str);
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      const str = chunk.toString();
      if (stderrBuffer.length < MAX_BUFFER_CHARS) {
        stderrBuffer += str;
      }
      if (!options.silent) {
        process.stderr.write(str);
      }
    });

    const cleanup = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      if (child.pid && !child.killed) {
        killProcessTree(child.pid, 'SIGTERM');
      }
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);

    if (options.timeout && options.timeout > 0) {
      timeoutTimer = setTimeout(() => {
        if (settled) return;
        timedOut = true;
        killProcessTree(child.pid, 'SIGTERM');
        killTimer = setTimeout(() => {
          if (!settled && child.pid && !child.killed) {
            killProcessTree(child.pid, 'SIGKILL');
          }
        }, 1500);
      }, options.timeout);
    }

    child.on('error', (err: Error) => {
      if (settled) return;
      settled = true;

      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      process.removeListener('SIGINT', cleanup);
      process.removeListener('SIGTERM', cleanup);

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const fullStderr = `${stderrBuffer}\nProcess Execution Error: ${err.message}`.trim();

      const capsule = createIncidentCapsule({
        command,
        args,
        exitCode: 127,
        durationMs,
        stdout: stdoutBuffer,
        stderr: fullStderr,
        cwd,
        format: options.format
      });

      let savedPath: { jsonPath: string; mdPath: string } | undefined;
      if (options.save !== false) {
        savedPath = saveIncident(capsule, cwd);
      }

      resolve({
        exitCode: 127,
        durationMs,
        stdout: stdoutBuffer,
        stderr: fullStderr,
        capsule,
        savedPath
      });
    });

    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;

      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      process.removeListener('SIGINT', cleanup);
      process.removeListener('SIGTERM', cleanup);

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      let exitCode = code ?? 0;
      let exitSignal: string | undefined = signal ?? undefined;

      if (timedOut) {
        exitCode = 124;
        exitSignal = 'SIGTERM';
        stderrBuffer = `${stderrBuffer}\nProcess Execution Error: Command timed out after ${options.timeout}ms`.trim();
      } else if (code === null && signal) {
        if (signal === 'SIGTERM') exitCode = 143;
        else if (signal === 'SIGKILL') exitCode = 137;
        else if (signal === 'SIGSEGV') exitCode = 139;
        else if (signal === 'SIGINT') exitCode = 130;
        else exitCode = 128;
      }

      let capsule;
      if (exitCode !== 0) {
        capsule = createIncidentCapsule({
          command,
          args,
          exitCode,
          durationMs,
          stdout: stdoutBuffer,
          stderr: stderrBuffer,
          cwd,
          exitSignal,
          format: options.format
        });

        let savedPath: { jsonPath: string; mdPath: string } | undefined;
        if (options.save !== false) {
          savedPath = saveIncident(capsule, cwd);
        }

        resolve({
          exitCode,
          durationMs,
          stdout: stdoutBuffer,
          stderr: stderrBuffer,
          capsule,
          savedPath
        });
      } else {
        resolve({
          exitCode,
          durationMs,
          stdout: stdoutBuffer,
          stderr: stderrBuffer
        });
      }
    });
  });
}
