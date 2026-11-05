export class CapsuleError extends Error {
  public readonly explanation: string;
  public readonly suggestion: string;

  constructor(message: string, explanation: string, suggestion: string) {
    super(message);
    this.name = 'CapsuleError';
    this.explanation = explanation;
    this.suggestion = suggestion;
  }
}

export class ProcessExecutionError extends CapsuleError {
  public readonly exitCode: number;

  constructor(command: string, exitCode: number, explanation: string, suggestion: string) {
    super(`Command failed with exit code ${exitCode}: ${command}`, explanation, suggestion);
    this.name = 'ProcessExecutionError';
    this.exitCode = exitCode;
  }
}

export class IncidentNotFoundError extends CapsuleError {
  constructor(id: string) {
    super(
      `Incident '${id}' not found`,
      `No recorded incident capsule matched identifier '${id}' in .capsule/incidents/`,
      `Run 'capsule list' to inspect recorded incident IDs or 'capsule run <cmd>' to record a new one.`
    );
    this.name = 'IncidentNotFoundError';
  }
}
