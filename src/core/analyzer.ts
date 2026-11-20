import type { PurifiedError, HeuristicRemedy } from '../types.js';

export function analyzeRemedy(error: PurifiedError, exitCode: number, rawOutput: string = ''): HeuristicRemedy | undefined {
  const combined = `${error.name} ${error.message} ${rawOutput}`.toLowerCase();

  // 1. Missing module / package dependency
  const nodeModuleMatch = error.message.match(/cannot find module\s+['"]?([^'"\s]+)['"]?/i);
  if (nodeModuleMatch) {
    const pkg = nodeModuleMatch[1];
    return {
      category: 'MISSING_DEPENDENCY',
      summary: `Node.js module '${pkg}' is missing`,
      suggestion: `The package '${pkg}' is not installed or not listed in package.json.`,
      confidence: 'high',
      commandHint: pkg.startsWith('.') || pkg.startsWith('/') ? undefined : `npm install ${pkg}`
    };
  }

  const pythonModuleMatch = error.message.match(/no module named\s+['"]?([^'"\s]+)['"]?/i);
  if (pythonModuleMatch) {
    const pkg = pythonModuleMatch[1];
    return {
      category: 'MISSING_DEPENDENCY',
      summary: `Python package '${pkg}' is not installed`,
      suggestion: `Python cannot import '${pkg}'. Ensure your virtualenv is active and packages are installed.`,
      confidence: 'high',
      commandHint: `pip install ${pkg}`
    };
  }

  const goPackageMatch = rawOutput.match(/cannot find package\s+["']([^"']+)["']/i);
  if (goPackageMatch) {
    const pkg = goPackageMatch[1];
    return {
      category: 'MISSING_DEPENDENCY',
      summary: `Go package '${pkg}' missing`,
      suggestion: `Download the missing module using go get.`,
      confidence: 'high',
      commandHint: `go get ${pkg}`
    };
  }

  // 2. Port already in use (EADDRINUSE)
  const portMatch = combined.match(/(?:eaddrinuse|address already in use).*?(?:port\s+|:)(\d{2,5})/i) ||
    combined.match(/:(\d{2,5})\s+address already in use/i);
  if (combined.includes('eaddrinuse') || combined.includes('address already in use')) {
    const port = portMatch ? portMatch[1] : undefined;
    return {
      category: 'PORT_CONFLICT',
      summary: port ? `Port ${port} is already in use` : 'Network port is already bound',
      suggestion: port
        ? `Another process is currently holding port ${port}. Stop that process or configure a different port.`
        : 'Another server or service is already listening on this address.',
      confidence: 'high',
      commandHint: port ? (process.platform === 'win32' ? `netstat -ano | findstr :${port}` : `lsof -i :${port}`) : undefined
    };
  }

  // 3. Connection refused (ECONNREFUSED)
  if (combined.includes('econnrefused') || combined.includes('connection refused')) {
    return {
      category: 'CONNECTION_REFUSED',
      summary: 'Target service connection refused',
      suggestion: 'The backend service, database daemon, or API is not running or not accepting connections.',
      confidence: 'high',
      commandHint: 'Check daemon status (e.g. docker ps, systemctl status, or database connection parameters)'
    };
  }

  // 4. Permission denied (EACCES)
  if (combined.includes('eacces') || combined.includes('permission denied')) {
    return {
      category: 'PERMISSION_DENIED',
      summary: 'Filesystem or socket permission denied',
      suggestion: 'Current user lacks required read/write/execute permissions for the target file or privileged port.',
      confidence: 'high',
      commandHint: 'Check file permissions or run with elevated user permissions'
    };
  }

  // 5. Memory exhaustion (OOM / Exit 137)
  if (
    exitCode === 137 ||
    combined.includes('out of memory') ||
    combined.includes('javascript heap out of memory') ||
    combined.includes('oom-killer')
  ) {
    return {
      category: 'MEMORY_EXHAUSTION',
      summary: 'Process killed due to memory exhaustion (OOM)',
      suggestion: 'Process exceeded available system or container memory limits and was killed (SIGKILL).',
      confidence: 'high',
      commandHint: combined.includes('node') || combined.includes('javascript')
        ? 'NODE_OPTIONS="--max-old-space-size=4096"'
        : 'Increase host/container memory allocation'
    };
  }

  // 6. Segmentation Fault (Exit 139 / SIGSEGV)
  if (exitCode === 139 || combined.includes('segmentation fault') || combined.includes('sigsegv')) {
    return {
      category: 'SEGMENTATION_FAULT',
      summary: 'Segmentation fault (invalid memory dereference)',
      suggestion: 'A native library or binary attempted to read/write unmapped virtual memory.',
      confidence: 'high',
      commandHint: 'Run under debugger (gdb / lldb) or inspect native C/C++ addons'
    };
  }

  // 7. Binary / Command not found (Exit 127)
  if (
    exitCode === 127 ||
    combined.includes('command not found') ||
    combined.includes('enoent') ||
    combined.includes('not recognized as an internal or external command')
  ) {
    const cmdMatch =
      rawOutput.match(/(?:bash|zsh|sh|pwsh|cmd)?:\s*([^\s:]+):\s*command not found/i) ||
      rawOutput.match(/command not found:\s*([^\s]+)/i) ||
      rawOutput.match(/spawn\s+([^\s:]+)\s+ENOENT/i) ||
      rawOutput.match(/'([^']+)'\s+is not recognized as an internal or external command/i);
    const cmd = cmdMatch ? cmdMatch[1] : undefined;
    const lookupCmd = process.platform === 'win32' ? 'where' : 'which';
    return {
      category: 'COMMAND_NOT_FOUND',
      summary: cmd ? `Command '${cmd}' not found` : 'Executable binary not found in PATH',
      suggestion: 'The specified binary is not installed or not in your current environment PATH.',
      confidence: 'high',
      commandHint: cmd ? `${lookupCmd} ${cmd}` : undefined
    };
  }

  // 8. Execution Timeout (Exit 124)
  if (exitCode === 124 || combined.includes('command timed out') || combined.includes('operation timed out')) {
    const timeoutMatch = combined.match(/timed out after (\d+)ms/i);
    const ms = timeoutMatch ? timeoutMatch[1] : undefined;
    return {
      category: 'EXECUTION_TIMEOUT',
      summary: ms ? `Process timed out after ${ms}ms` : 'Process execution timed out',
      suggestion: 'Process exceeded execution timeout limit. Check for infinite loops, deadlocks, hanging child processes, or slow remote endpoints.',
      confidence: 'high',
      commandHint: ms ? `Run with higher timeout limit (e.g. --timeout ${parseInt(ms, 10) * 2})` : undefined
    };
  }

  // 9. Database Missing Table / Unapplied Migrations
  if (
    (combined.includes('does not exist') && (combined.includes('relation') || combined.includes('table'))) ||
    combined.includes('no such table') ||
    (combined.includes("doesn't exist") && combined.includes('table'))
  ) {
    return {
      category: 'DATABASE_MIGRATION',
      summary: 'Database table or relation does not exist',
      suggestion: 'A database query targeted a table that has not been created yet. Unapplied migrations are likely pending.',
      confidence: 'high',
      commandHint: 'Run database migration command (e.g. npx prisma migrate deploy, alembic upgrade head, or go-migrate)'
    };
  }

  // 10. Unresolved Git merge conflict
  if (combined.includes('merge conflict') || combined.includes('conflict marker')) {
    return {
      category: 'GIT_CONFLICT',
      summary: 'Unresolved merge conflict markers detected',
      suggestion: 'Source files contain unmerged conflict delimiters (<<<<<<<, =======, >>>>>>>).',
      confidence: 'medium',
      commandHint: 'git diff --check'
    };
  }

  // 11. Generic Syntax Error
  if (error.name.includes('SyntaxError') || combined.includes('syntaxerror')) {
    return {
      category: 'SYNTAX_ERROR',
      summary: 'Syntax error in source code',
      suggestion: 'Parser encountered unexpected syntax, unclosed braces, or invalid language tokens.',
      confidence: 'medium',
      commandHint: error.file && error.line ? `Open ${error.file}:${error.line}` : undefined
    };
  }

  return undefined;
}
