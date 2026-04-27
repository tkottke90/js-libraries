import { readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export type ConfigFileFormat = 'yaml' | 'json';

export function detectFormat(filePath: string): ConfigFileFormat {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  if (ext === '.json') return 'json';
  throw new Error(
    `Unsupported config file extension "${ext}". Use .yaml, .yml, or .json.`
  );
}

export function readConfigFile(filePath: string): Record<string, unknown> {
  const format = detectFormat(filePath);
  const raw = readFileSync(filePath, 'utf8');

  if (format === 'json') {
    return JSON.parse(raw) as Record<string, unknown>;
  }

  return (parseYaml(raw) ?? {}) as Record<string, unknown>;
}

export function writeConfigFile(
  filePath: string,
  data: Record<string, unknown>
): void {
  const format = detectFormat(filePath);

  if (format === 'json') {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } else {
    writeFileSync(filePath, stringifyYaml(data), 'utf8');
  }
}
