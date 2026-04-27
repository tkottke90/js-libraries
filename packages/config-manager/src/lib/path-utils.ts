import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { writeConfigFile } from './format.js';
import type { LoadConfigOptions } from './types.js';

export function resolveConfigPath(options: LoadConfigOptions): string {
  const { appName, configDir } = options;

  const dir =
    configDir ??
    process.env['CONFIG_DIR'] ??
    join(homedir(), 'config', appName);

  // If the provided path already looks like a file (has a known extension), use it directly
  const hasExtension = /\.(yaml|yml|json)$/i.test(dir);
  if (hasExtension) {
    return resolve(dir);
  }

  // Otherwise treat it as a directory and default to config.yaml
  return resolve(dir, 'config.yaml');
}

export function ensureConfigExists(
  filePath: string,
  schema: LoadConfigOptions['schema']
): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(filePath)) {
    const defaults = schema.parse({}) as Record<string, unknown>;
    writeConfigFile(filePath, defaults);
  }
}
