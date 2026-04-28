export const defaultLevels = [
  'foobar',
  'error',
  'warn',
  'notify',
  'info',
  'event',
  'debug',
] as const;

/**
 * Color map for each custom level, used with `winston.addColors()` so
 * colorized transports render each level distinctly.
 */
export const levelColors: Record<string, string> = {
  foobar: 'magenta',
  error: 'red',
  warn: 'yellow',
  notify: 'cyan',
  info: 'green',
  event: 'blue',
  debug: 'white',
};

/**
 * Winston-compatible levels map derived from `defaultLevels`.
 * Lower number = higher priority, matching Winston's convention.
 */
export const customLevels: Record<string, number> = Object.fromEntries(
  defaultLevels.map((level, index) => [level, index])
);