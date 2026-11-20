import { spawnSync } from 'node:child_process';

export function isClipboardAvailable(): boolean {
  try {
    if (process.platform === 'win32') {
      const check = spawnSync('where', ['powershell.exe'], { stdio: 'ignore' });
      return check.status === 0;
    }

    if (process.platform === 'darwin') {
      const check = spawnSync('which', ['pbcopy'], { stdio: 'ignore' });
      return check.status === 0;
    }

    for (const cmd of ['wl-copy', 'xclip', 'xsel']) {
      try {
        const check = spawnSync('which', [cmd], { stdio: 'ignore' });
        if (check.status === 0) return true;
      } catch {
        continue;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function copyToClipboard(text: string): boolean {
  try {
    if (process.platform === 'win32') {
      const proc = spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          '[Console]::InputEncoding = [System.Text.Encoding]::UTF8; [Console]::In.ReadToEnd() | Set-Clipboard'
        ],
        {
          input: text,
          encoding: 'utf8',
          timeout: 4000
        }
      );
      return proc.status === 0;
    }

    if (process.platform === 'darwin') {
      const proc = spawnSync('pbcopy', [], {
        input: text,
        encoding: 'utf8',
        timeout: 4000
      });
      return proc.status === 0;
    }

    // Linux / BSD: Try wl-copy (Wayland), then xclip, then xsel
    const tools = [
      { cmd: 'wl-copy', args: [] },
      { cmd: 'xclip', args: ['-selection', 'clipboard'] },
      { cmd: 'xsel', args: ['--clipboard', '--input'] }
    ];

    for (const tool of tools) {
      try {
        const proc = spawnSync(tool.cmd, tool.args, {
          input: text,
          encoding: 'utf8',
          timeout: 4000
        });
        if (proc.status === 0) return true;
      } catch {
        continue;
      }
    }

    return false;
  } catch {
    return false;
  }
}
