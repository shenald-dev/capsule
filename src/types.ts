export type PurifiedEngine = 'v8' | 'python' | 'rust' | 'go' | 'jvm' | 'generic';

export type PromptFormat = 'markdown' | 'claude' | 'chatgpt' | 'github';

export interface HeuristicRemedy {
  category: string;
  summary: string;
  suggestion: string;
  confidence: 'high' | 'medium' | 'low';
  commandHint?: string;
}

export interface IncidentCapsule {
  id: string;
  timestamp: string;
  command: string;
  args: string[];
  exitCode: number;
  durationMs: number;
  status: 'failed' | 'success';
  rootCause: PurifiedError;
  remedy?: HeuristicRemedy;
  system: SystemSnapshot;
  git: GitSnapshot;
  environment: Record<string, string>;
  output: OutputSnapshot;
  aiPrompt: string;
  cwd?: string;
}

export interface PurifiedError {
  engine: PurifiedEngine;
  name: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  codeSnippet?: string;
  purifiedFrames: StackFrame[];
  rawTraceback: string;
}

export interface StackFrame {
  file: string;
  line?: number;
  column?: number;
  functionName?: string;
  isInternal: boolean;
}

export interface SystemSnapshot {
  platform: string;
  arch: string;
  osRelease: string;
  nodeVersion: string;
  pythonVersion?: string;
  gitVersion?: string;
  goVersion?: string;
  rustVersion?: string;
  javaVersion?: string;
  memory: {
    totalMb: number;
    freeMb: number;
    usedMb: number;
  };
  cpus: number;
}

export interface GitSnapshot {
  isRepo: boolean;
  branch?: string;
  commitHash?: string;
  commitMessage?: string;
  isDirty?: boolean;
  diffSummary?: string;
  diffSnippet?: string;
}

export interface OutputSnapshot {
  stdout: string;
  stderr: string;
  combined: string;
  truncated: boolean;
  totalLines: number;
  totalBytes?: number;
  exitSignal?: string;
}

export interface ExecutionOptions {
  silent?: boolean;
  quiet?: boolean;
  json?: boolean;
  copy?: boolean;
  save?: boolean;
  cwd?: string;
  timeout?: number;
  format?: PromptFormat;
}

export interface ExecutionResult {
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  capsule?: IncidentCapsule;
  savedPath?: { jsonPath: string; mdPath: string };
}
