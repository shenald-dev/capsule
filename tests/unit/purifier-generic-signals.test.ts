import { describe, it, expect } from 'vitest';
import { purifyErrorOutput } from '../../src/core/purifier/index.js';

describe('Generic Error & Signals Purifier', () => {
  it('detects Segmentation Faults', () => {
    const log = `
Running test_native_bindings...
[1] 45212 segmentation fault (core dumped) ./bin/native_addon
`;
    const result = purifyErrorOutput(log);
    expect(result.name).toBe('SegmentationFault');
    expect(result.message).toContain('Segmentation Fault');
  });

  it('detects Out of Memory (OOM) crashes', () => {
    const log = `
<--- Last few GCs --->
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
`;
    const result = purifyErrorOutput(log);
    expect(result.name).toBe('OutOfMemory');
    expect(result.message).toContain('Memory Exhaustion');
  });

  it('detects AddressSanitizer (ASAN) memory errors', () => {
    const log = `
==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000010
READ of size 4 at 0x602000000010 thread T0
`;
    const result = purifyErrorOutput(log);
    expect(result.name).toBe('AddressSanitizer');
    expect(result.message).toContain('heap-use-after-free on address 0x602000000010');
  });
});
