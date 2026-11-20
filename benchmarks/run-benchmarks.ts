import { spawnSync } from 'node:child_process';
import { executeCommand } from '../src/core/runner.js';
import { purifyErrorOutput } from '../src/core/purifier/index.js';
import { redactString } from '../src/core/redactor.js';
import { formatPrompt } from '../src/core/prompts.js';
import type { IncidentCapsule } from '../src/types.js';

async function runBenchmarks() {
  console.log('====================================================');
  console.log('       CAPSULE EMPIRICAL BENCHMARK SUITE (v0.2.0)    ');
  console.log('====================================================\n');

  // 1. Process Runner Overhead Benchmark
  console.log('1. Measuring Process Runner Overhead...');
  const ITERATIONS = 10;
  
  // Direct baseline
  const directDurations: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = process.hrtime.bigint();
    spawnSync(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' });
    const t1 = process.hrtime.bigint();
    directDurations.push(Number(t1 - t0) / 1_000_000);
  }

  // Capsule executeCommand
  const capsuleDurations: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = process.hrtime.bigint();
    await executeCommand(process.execPath, ['-e', 'process.exit(0)'], { silent: true });
    const t1 = process.hrtime.bigint();
    capsuleDurations.push(Number(t1 - t0) / 1_000_000);
  }

  const avgDirect = directDurations.reduce((a, b) => a + b, 0) / directDurations.length;
  const avgCapsule = capsuleDurations.reduce((a, b) => a + b, 0) / capsuleDurations.length;
  const runnerOverhead = Math.max(0, avgCapsule - avgDirect);

  console.log(`   Direct Process Avg:   ${avgDirect.toFixed(2)} ms`);
  console.log(`   Capsule Process Avg:  ${avgCapsule.toFixed(2)} ms`);
  console.log(`   Streaming Overhead:   ${runnerOverhead.toFixed(2)} ms (target < 5ms)\n`);

  // 2. Stacktrace Purifier Throughput
  console.log('2. Measuring Stacktrace Purifier Throughput...');
  const testTraces = [
    `TypeError: Cannot read properties of undefined (reading 'auth')\n    at validateSession (src/auth.ts:42:18)\n    at Layer.handle (node_modules/express/router.js:95:5)`,
    `Traceback (most recent call last):\n  File "/lib/python/flask/app.py", line 10, in run\n  File "app/main.py", line 45, in handler\nKeyError: 'user'`,
    `thread 'main' panicked at 'called Option::unwrap() on None', src/parser.rs:88:14`,
    `panic: runtime error: index out of range [2]\ngoroutine 1 [running]:\nmain.calc()\n\t/app/calc.go:20 +0x3a`,
    `Exception in thread "main" java.lang.NullPointerException: null\n\tat com.app.Service.run(Service.java:12)\n\tat java.base/jdk.internal.run()`
  ];

  const PURIFY_ITERATIONS = 5000;
  const tPurify0 = process.hrtime.bigint();
  for (let i = 0; i < PURIFY_ITERATIONS; i++) {
    purifyErrorOutput(testTraces[i % testTraces.length]);
  }
  const tPurify1 = process.hrtime.bigint();
  const totalPurifyMs = Number(tPurify1 - tPurify0) / 1_000_000;
  const purifyOpsPerSec = Math.round((PURIFY_ITERATIONS / totalPurifyMs) * 1000);

  console.log(`   Iterations:           ${PURIFY_ITERATIONS}`);
  console.log(`   Total Duration:       ${totalPurifyMs.toFixed(2)} ms`);
  console.log(`   Throughput:           ${purifyOpsPerSec.toLocaleString()} ops/sec\n`);

  // 3. Secret Redaction Throughput
  console.log('3. Measuring Secret Redactor Throughput...');
  const mockAws = ['AKIA', '0000000000000000'].join('');
  const mockSlack = ['xoxb', '000000000000', '000000000000', 'mocktokenvaluehere'].join('-');
  const sampleLog = `
Connecting to postgres://admin:superSecretPass123@prod.db.internal:5432/main
Authorization: Bearer abcdef1234567890abcdef1234567890
GitHub token: ghp_111122223333444455556666777788889999
OpenAI key: sk-proj-1234567890abcdefghijklmnopqrstuvwxyz_0123456789
Anthropic key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz_1234567890
AWS Key: ${mockAws}
Slack token: ${mockSlack}
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y1234567890abcdef
-----END RSA PRIVATE KEY-----
`.repeat(10); // ~10KB per block

  const REDACT_ITERATIONS = 2000;
  const bytesPerIter = Buffer.byteLength(sampleLog, 'utf8');
  const totalBytesProcessed = bytesPerIter * REDACT_ITERATIONS;

  const tRedact0 = process.hrtime.bigint();
  for (let i = 0; i < REDACT_ITERATIONS; i++) {
    redactString(sampleLog);
  }
  const tRedact1 = process.hrtime.bigint();
  const totalRedactMs = Number(tRedact1 - tRedact0) / 1_000_000;
  const redactMbPerSec = ((totalBytesProcessed / (1024 * 1024)) / (totalRedactMs / 1000)).toFixed(2);

  console.log(`   Data Processed:       ${(totalBytesProcessed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   Total Duration:       ${totalRedactMs.toFixed(2)} ms`);
  console.log(`   Throughput:           ${redactMbPerSec} MB/sec\n`);

  // 4. Prompt Generator Performance
  console.log('4. Measuring AI Prompt Generator (All 4 Formats)...');
  const mockCapsule: Omit<IncidentCapsule, 'aiPrompt'> = {
    id: 'inc_bench_001',
    timestamp: '2026-11-20T12:00:00Z',
    command: 'npm test',
    args: [],
    exitCode: 1,
    durationMs: 350,
    status: 'failed',
    rootCause: {
      engine: 'v8',
      name: 'TypeError',
      message: 'Failed property access',
      file: 'src/index.ts',
      line: 42,
      column: 10,
      codeSnippet: ' > 42 | x.y()',
      purifiedFrames: [{ file: 'src/index.ts', line: 42, column: 10, isInternal: false }],
      rawTraceback: 'TypeError: Failed property access'
    },
    system: {
      platform: 'win32',
      arch: 'x64',
      osRelease: '10.0',
      nodeVersion: 'v22.0.0',
      memory: { totalMb: 16000, freeMb: 8000, usedMb: 8000 },
      cpus: 8
    },
    git: { isRepo: true, branch: 'main', isDirty: false },
    environment: {},
    output: { stdout: '', stderr: 'Error details', combined: 'Error details', truncated: false, totalLines: 1 }
  };

  const PROMPT_ITERATIONS = 2000;
  const formats = ['markdown', 'claude', 'chatgpt', 'github'] as const;
  for (const fmt of formats) {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < PROMPT_ITERATIONS; i++) {
      formatPrompt(mockCapsule, fmt);
    }
    const t1 = process.hrtime.bigint();
    const durMs = Number(t1 - t0) / 1_000_000;
    const ops = Math.round((PROMPT_ITERATIONS / durMs) * 1000);
    console.log(`   Format [${fmt.padEnd(8)}]: ${ops.toLocaleString()} prompts/sec (${(durMs / PROMPT_ITERATIONS).toFixed(3)} ms/prompt)`);
  }

  console.log('\n====================================================');
  console.log('         BENCHMARK SUITE COMPLETED SUCCESSFULLY     ');
  console.log('====================================================');
}

runBenchmarks().catch(console.error);
