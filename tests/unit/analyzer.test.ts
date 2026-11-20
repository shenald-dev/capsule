import { describe, it, expect } from 'vitest';
import { analyzeRemedy } from '../../src/core/analyzer.js';
import type { PurifiedError } from '../../src/types.js';

describe('Heuristic Remedy Analyzer', () => {
  it('diagnoses missing Node module and suggests npm install', () => {
    const error: PurifiedError = {
      engine: 'generic',
      name: 'RuntimeError',
      message: "Cannot find module 'lodash'",
      purifiedFrames: [],
      rawTraceback: ''
    };

    const remedy = analyzeRemedy(error, 1, "Error: Cannot find module 'lodash'");
    expect(remedy).toBeDefined();
    expect(remedy?.category).toBe('MISSING_DEPENDENCY');
    expect(remedy?.commandHint).toBe('npm install lodash');
    expect(remedy?.confidence).toBe('high');
  });

  it('diagnoses missing Python package and suggests pip install', () => {
    const error: PurifiedError = {
      engine: 'python',
      name: 'ModuleNotFoundError',
      message: "No module named 'requests'",
      purifiedFrames: [],
      rawTraceback: ''
    };

    const remedy = analyzeRemedy(error, 1);
    expect(remedy?.category).toBe('MISSING_DEPENDENCY');
    expect(remedy?.commandHint).toBe('pip install requests');
  });

  it('diagnoses EADDRINUSE port conflicts and extracts the port number', () => {
    const error: PurifiedError = {
      engine: 'v8',
      name: 'Error',
      message: 'listen EADDRINUSE: address already in use :::8080',
      purifiedFrames: [],
      rawTraceback: ''
    };

    const remedy = analyzeRemedy(error, 1);
    expect(remedy?.category).toBe('PORT_CONFLICT');
    expect(remedy?.summary).toContain('8080');
  });

  it('diagnoses ECONNREFUSED connection failures', () => {
    const error: PurifiedError = {
      engine: 'generic',
      name: 'RuntimeError',
      message: 'connect ECONNREFUSED 127.0.0.1:5432',
      purifiedFrames: [],
      rawTraceback: ''
    };

    const remedy = analyzeRemedy(error, 1);
    expect(remedy?.category).toBe('CONNECTION_REFUSED');
  });

  it('diagnoses Exit 137 as Memory Exhaustion (OOM)', () => {
    const error: PurifiedError = {
      engine: 'generic',
      name: 'OutOfMemory',
      message: 'Process was terminated by system due to Memory Exhaustion (OOM).',
      purifiedFrames: [],
      rawTraceback: ''
    };

    const remedy = analyzeRemedy(error, 137);
    expect(remedy?.category).toBe('MEMORY_EXHAUSTION');
  });

  it('diagnoses Exit 139 as Segmentation Fault', () => {
    const error: PurifiedError = {
      engine: 'generic',
      name: 'SegmentationFault',
      message: 'Process crashed with Segmentation Fault (SIGSEGV).',
      purifiedFrames: [],
      rawTraceback: ''
    };

    const remedy = analyzeRemedy(error, 139);
    expect(remedy?.category).toBe('SEGMENTATION_FAULT');
  });

  it('diagnoses Exit 127 as Command Not Found', () => {
    const error: PurifiedError = {
      engine: 'generic',
      name: 'CommandFailed',
      message: 'Command not found',
      purifiedFrames: [],
      rawTraceback: ''
    };

    const remedy = analyzeRemedy(error, 127, 'bash: cargo: command not found');
    expect(remedy?.category).toBe('COMMAND_NOT_FOUND');
    expect(remedy?.commandHint).toBe('which cargo');
  });
});
