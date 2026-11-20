import { describe, it, expect } from 'vitest';
import { parseGoPanic } from '../../src/core/purifier/go.js';
import { purifyErrorOutput } from '../../src/core/purifier/index.js';

describe('Go Panic Purifier', () => {
  it('parses Go runtime panic and filters internal runtime frames', () => {
    const rawGoLog = `
panic: runtime error: index out of range [2] with length 2

goroutine 1 [running]:
main.calculateScore(0x10, 0x20)
\t/Users/dev/myapp/calc.go:42 +0x3a
runtime.gopanic(0x10)
\t/usr/local/go/src/runtime/panic.go:884 +0x212
main.main()
\t/Users/dev/myapp/main.go:15 +0x80
`;

    const result = parseGoPanic(rawGoLog);
    expect(result).not.toBeNull();
    expect(result?.engine).toBe('go');
    expect(result?.name).toBe('GoPanic');
    expect(result?.message).toBe('runtime error: index out of range [2] with length 2');
    expect(result?.file).toBe('/Users/dev/myapp/calc.go');
    expect(result?.line).toBe(42);
    // Runtime frame should be filtered out
    expect(result?.purifiedFrames.some((f) => f.file.includes('runtime/panic.go'))).toBe(false);
    expect(result?.purifiedFrames.length).toBe(2);
    expect(result?.purifiedFrames[0].functionName).toBe('main.calculateScore');
  });

  it('handles Go fatal error logs', () => {
    const fatalLog = `
fatal error: all goroutines are asleep - deadlock!

goroutine 1 [chan receive]:
main.worker()
\t/home/runner/work/service/worker.go:88 +0x45
`;

    const result = purifyErrorOutput(fatalLog);
    expect(result.engine).toBe('go');
    expect(result.name).toBe('GoFatalError');
    expect(result.message).toContain('all goroutines are asleep - deadlock!');
    expect(result.file).toBe('/home/runner/work/service/worker.go');
    expect(result.line).toBe(88);
  });

  it('returns null for non-Go logs', () => {
    const jsLog = 'ReferenceError: foo is not defined\n  at test (app.js:1:1)';
    const result = parseGoPanic(jsLog);
    expect(result).toBeNull();
  });
});
