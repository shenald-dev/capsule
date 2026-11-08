import spawn from 'cross-spawn';
import type { ExecutionOptions, ExecutionResult } from '../types.js';
import { createIncidentCapsule } from './snapshot.js';
import { saveIncident } from './storage.js';

export async function executeCommand(
  command: string,
  args: string[] = [],
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const startTime = process.hrtime.bigint();
  const cwd = options.cwd || process.cwd();

  return new Promise<ExecutionResult>((resolve, reject) => {
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let settled = false;

    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      const str = chunk.toString();
      stdoutBuffer += str;
      if (!options.silent) {
        process.stdout.write(str);
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      const str = chunk.toString();
      stderrBuffer += str;
      if (!options.silent) {
        process.stderr.write(str);
      }
    });

    const cleanup = () => {
      if (child.pid && !child.killed) {
        try {
          child.kill('SIGTERM');
        } catch {
          // Ignore
        }
      }
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);

    child.on('error', (err: Error) => {
      if (settled) return;
      settled = true;

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
        cwd
      });

      if (options.save !== false) {
        saveIncident(capsule, cwd);
      }

      resolve({
        exitCode: 127,
        durationMs,
        stdout: stdoutBuffer,
        stderr: fullStderr,
        capsule
      });
    });

    child.on('close', (code: number | null) => {
      if (settled) return;
      settled = true;
      process.removeListener('SIGINT', cleanup);
      process.removeListener('SIGTERM', cleanup);

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const exitCode = code ?? 0;

      let capsule;
      if (exitCode !== 0) {
        capsule = createIncidentCapsule({
          command,
          args,
          exitCode,
          durationMs,
          stdout: stdoutBuffer,
          stderr: stderrBuffer,
          cwd
        });

        if (options.save !== false) {
          saveIncident(capsule, cwd);
        }
      }

      resolve({
        exitCode,
        durationMs,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        capsule
      });
    });
  });
}
