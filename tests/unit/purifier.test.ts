import { describe, it, expect } from 'vitest';
import { purifyErrorOutput } from '../../src/core/purifier/index.js';
import { parseNodeStacktrace } from '../../src/core/purifier/node.js';
import { parsePythonTraceback } from '../../src/core/purifier/python.js';
import { parseRustPanic } from '../../src/core/purifier/rust.js';

describe('Stacktrace Purifier Engine', () => {
  it('purifies V8 Node.js / TypeScript stacktrace and strips internals', () => {
    const rawError = `
TypeError: Cannot read properties of undefined (reading 'token')
    at validateSession (D:\\projects\\app\\src\\auth.ts:42:18)
    at Layer.handle [as handle_request] (D:\\projects\\app\\node_modules\\express\\lib\\router\\layer.js:95:5)
    at trim_prefix (D:\\projects\\app\\node_modules\\express\\lib\\router\\index.js:328:13)
    at node:internal/process/task_queues:95:5
`;
    const result = parseNodeStacktrace(rawError);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('TypeError');
    expect(result?.message).toBe("Cannot read properties of undefined (reading 'token')");
    expect(result?.file).toBe('D:\\projects\\app\\src\\auth.ts');
    expect(result?.line).toBe(42);
    expect(result?.column).toBe(18);
    // Express and internal frames should be filtered out
    expect(result?.purifiedFrames.length).toBe(1);
    expect(result?.purifiedFrames[0].functionName).toBe('validateSession');
  });

  it('purifies Python tracebacks and filters site-packages', () => {
    const rawTrace = `
Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/flask/app.py", line 1484, in full_dispatch_request
    rv = self.dispatch_request()
  File "/app/src/routes.py", line 18, in get_user
    return database[user_id]
KeyError: 'user_123'
`;
    const result = parsePythonTraceback(rawTrace);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('KeyError');
    expect(result?.message).toBe("'user_123'");
    expect(result?.file).toBe('/app/src/routes.py');
    expect(result?.line).toBe(18);
    expect(result?.purifiedFrames.length).toBe(1);
    expect(result?.purifiedFrames[0].functionName).toBe('get_user');
  });

  it('purifies Rust panic messages (legacy and modern Rust 1.70+)', () => {
    const rawPanicLegacy = `thread 'main' panicked at 'called \`Option::unwrap()\` on a \`None\` value', src/parser.rs:88:14`;
    const resultLegacy = parseRustPanic(rawPanicLegacy);
    expect(resultLegacy).not.toBeNull();
    expect(resultLegacy?.name).toBe('RustPanic');
    expect(resultLegacy?.message).toContain('called `Option::unwrap()` on a `None` value');
    expect(resultLegacy?.file).toBe('src/parser.rs');
    expect(resultLegacy?.line).toBe(88);
    expect(resultLegacy?.column).toBe(14);

    const rawPanicModern = `thread 'main' panicked at src/parser.rs:88:14:\ncalled \`Option::unwrap()\` on a \`None\` value\nnote: run with \`RUST_BACKTRACE=1\``;
    const resultModern = parseRustPanic(rawPanicModern);
    expect(resultModern).not.toBeNull();
    expect(resultModern?.name).toBe('RustPanic');
    expect(resultModern?.message).toContain('called `Option::unwrap()` on a `None` value');
    expect(resultModern?.file).toBe('src/parser.rs');
    expect(resultModern?.line).toBe(88);
    expect(resultModern?.column).toBe(14);
  });

  it('purifies TypeScript (tsc) compilation errors', () => {
    const tsLog = `src/index.ts:15:22 - error TS2304: Cannot find name 'foo'.\n\n15     const x = foo + 1;\n                 ~~~`;
    const result = purifyErrorOutput(tsLog);
    expect(result.name).toBe('TS2304');
    expect(result.message).toBe("Cannot find name 'foo'.");
    expect(result.file).toBe('src/index.ts');
    expect(result.line).toBe(15);
    expect(result.column).toBe(22);
  });

  it('correctly purifies Python SyntaxError without node purifier hijacking', () => {
    const pySyntax = `  File "main.py", line 14\n    print("hello"\n                ^\nSyntaxError: unexpected EOF while parsing`;
    const result = purifyErrorOutput(pySyntax);
    expect(result.engine).toBe('python');
    expect(result.name).toBe('SyntaxError');
    expect(result.file).toBe('main.py');
    expect(result.line).toBe(14);
    expect(result.message).toBe('unexpected EOF while parsing');
  });

  it('purifies compiler errors (clang/gcc/tsc)', () => {
    const compilerLog = `src/main.cpp:45:12: error: expected ';' before 'return'`;
    const result = purifyErrorOutput(compilerLog);
    expect(result.name).toBe('ERROR');
    expect(result.message).toBe("expected ';' before 'return'");
    expect(result.file).toBe('src/main.cpp');
    expect(result.line).toBe(45);
    expect(result.column).toBe(12);
  });

  it('falls back to generic error extraction on unknown output', () => {
    const genericLog = `Execution failed with exit code 1`;
    const result = purifyErrorOutput(genericLog);
    expect(result.name).toBe('CommandFailed');
    expect(result.message).toContain('Execution failed with exit code 1');
  });
});
