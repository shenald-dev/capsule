import fs from 'node:fs';
import path from 'node:path';
import { captureSystemSnapshot } from '../../platform/system.js';
import { captureGitSnapshot } from '../../platform/git.js';
import { copyToClipboard } from '../../platform/clipboard.js';
import { getIncidentsDir } from '../../core/storage.js';
import { theme } from '../../utils/theme.js';

export function doctorCommandAction(): void {
  console.log('\n' + theme.bold('  🩺 capsule System Diagnostics (v0.2.0)') + '\n');

  const system = captureSystemSnapshot();
  const git = captureGitSnapshot();
  const incidentsDir = getIncidentsDir();

  // 1. Node.js Check
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  const nodeOk = nodeMajor >= 18;
  console.log(
    `  ${nodeOk ? theme.symbols.check : theme.symbols.cross} Node.js Runtime: ${theme.white(process.version)} ` +
      (nodeOk ? theme.dim('(Supported >=18.0.0)') : theme.error('(Requires Node.js 18+)'))
  );

  // 2. OS & Architecture
  console.log(`  ${theme.symbols.check} Operating System: ${theme.white(`${system.platform} (${system.arch}, ${system.osRelease}, ${system.cpus} CPUs)`)}`);

  // 3. Git Availability
  if (git.isRepo) {
    console.log(
      `  ${theme.symbols.check} Git Integration: ${theme.success('Active')} ` +
        theme.dim(`(Branch: ${git.branch}, Commit: ${git.commitHash || 'none'}, Dirty: ${git.isDirty})`)
    );
  } else if (system.gitVersion) {
    console.log(`  ${theme.symbols.check} Git Binary: ${theme.white(system.gitVersion)} ${theme.dim('(Not inside a git repository)')}`);
  } else {
    console.log(`  ${theme.symbols.warn} Git Binary: ${theme.warning('Not detected in PATH')}`);
  }

  // 4. Detected Language Ecosystems
  const detectedToolchains: string[] = [];
  if (system.pythonVersion) detectedToolchains.push(`Python (${system.pythonVersion})`);
  if (system.goVersion) detectedToolchains.push(`Go (${system.goVersion})`);
  if (system.rustVersion) detectedToolchains.push(`Rust (${system.rustVersion})`);
  if (system.javaVersion) detectedToolchains.push(`JVM (${system.javaVersion})`);

  if (detectedToolchains.length > 0) {
    console.log(`  ${theme.symbols.check} Detected Toolchains: ${theme.white(detectedToolchains.join(' • '))}`);
  }

  // 5. Storage Directory Permissions
  let storageOk = false;
  try {
    if (!fs.existsSync(incidentsDir)) {
      fs.mkdirSync(incidentsDir, { recursive: true });
    }
    const testFile = path.join(incidentsDir, '.doctor_probe');
    fs.writeFileSync(testFile, 'probe');
    fs.unlinkSync(testFile);
    storageOk = true;
  } catch {
    storageOk = false;
  }

  console.log(
    `  ${storageOk ? theme.symbols.check : theme.symbols.cross} Capsule Storage: ` +
      (storageOk ? theme.success('Writable (.capsule/incidents/)') : theme.error('Read-only or inaccessible'))
  );

  // 6. Clipboard Integration
  const clipboardTest = copyToClipboard('capsule-doctor-probe');
  console.log(
    `  ${clipboardTest ? theme.symbols.check : theme.symbols.warn} Clipboard System: ` +
      (clipboardTest ? theme.success('Functional') : theme.dim('Unavailable (Fallback to stdout active)'))
  );

  // 7. Memory Profile
  console.log(
    `  ${theme.symbols.check} Host Memory: ${theme.white(`${system.memory.usedMb}MB used / ${system.memory.totalMb}MB total`)}`
  );

  console.log('\n  ' + theme.success('All essential diagnostic checks completed.') + '\n');
}
