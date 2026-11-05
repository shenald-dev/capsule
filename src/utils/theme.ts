import pc from 'picocolors';

const isColorSupported =
  !process.env.NO_COLOR &&
  (process.env.FORCE_COLOR || (process.stdout.isTTY && process.env.TERM !== 'dumb'));

export const stripAnsi = (str: string): string =>
  str.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );

export const theme = {
  // Brand colors
  brand: (s: string) => (isColorSupported ? pc.bold(pc.cyan(s)) : s),
  brandMuted: (s: string) => (isColorSupported ? pc.cyan(s) : s),
  accent: (s: string) => (isColorSupported ? pc.magenta(s) : s),
  
  // Status colors
  success: (s: string) => (isColorSupported ? pc.bold(pc.green(s)) : s),
  error: (s: string) => (isColorSupported ? pc.bold(pc.red(s)) : s),
  warning: (s: string) => (isColorSupported ? pc.bold(pc.yellow(s)) : s),
  info: (s: string) => (isColorSupported ? pc.bold(pc.blue(s)) : s),
  
  // Tones
  dim: (s: string) => (isColorSupported ? pc.dim(s) : s),
  bold: (s: string) => (isColorSupported ? pc.bold(s) : s),
  white: (s: string) => (isColorSupported ? pc.white(s) : s),
  code: (s: string) => (isColorSupported ? pc.cyan(s) : s),
  highlight: (s: string) => (isColorSupported ? pc.bgRed(pc.white(` ${s} `)) : s),
  
  // Symbols
  symbols: {
    check: isColorSupported ? pc.green('✔') : '[OK]',
    cross: isColorSupported ? pc.red('✖') : '[ERR]',
    warn: isColorSupported ? pc.yellow('⚠') : '[WARN]',
    info: isColorSupported ? pc.cyan('ℹ') : '[INFO]',
    arrow: isColorSupported ? pc.dim('→') : '->',
    dot: isColorSupported ? pc.dim('•') : '*',
    pointer: isColorSupported ? pc.cyan('❯') : '>',
    sparkles: '✨',
    capsule: '📦',
    fire: '💥',
    target: '📍',
    clipboard: '📋',
    replay: '🔄',
    shield: '🛡️',
    clock: '⏱️'
  }
};
