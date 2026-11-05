export interface IncidentCapsule {
  id: string;
  timestamp: string;
  command: string;
  args: string[];
  exitCode: number;
  durationMs: number;
  status: 'failed' | 'success';
  rootCause: PurifiedError;
  system: SystemSnapshot;
  git: GitSnapshot;
  environment: Record<string, string>;
  output: OutputSnapshot;
  aiPrompt: string;
}

export interface PurifiedError {
  engine: 'v8' | 'python' | 'rust' | 'generic';
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
}

export interface ExecutionOptions {
  silent?: boolean;
  quiet?: boolean;
  json?: boolean;
  copy?: boolean;
  save?: boolean;
  cwd?: string;
}

export interface ExecutionResult {
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  capsule?: IncidentCapsule;
}
