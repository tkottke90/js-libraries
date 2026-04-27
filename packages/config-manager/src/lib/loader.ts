import { ConfigManagerImpl } from './config-manager.js';
import { readConfigFile } from './format.js';
import { interpolateEnvVars } from './interpolate.js';
import { ensureConfigExists, resolveConfigPath } from './path-utils.js';
import type { LoadConfigOptions } from './types.js';
import { validateAndMigrate } from './validate.js';

export { ensureConfigExists, resolveConfigPath } from './path-utils.js';

export function loadConfig(options: LoadConfigOptions): ConfigManagerImpl {
  const configPath = resolveConfigPath(options);

  ensureConfigExists(configPath, options.schema);

  const raw = readConfigFile(configPath);
  const interpolated = interpolateEnvVars(raw) as Record<string, unknown>;
  const validated = validateAndMigrate(interpolated, options.schema, configPath);

  if (options.runtimeValues) {
    for (const [key, value] of Object.entries(options.runtimeValues)) {
      validated[key] = value;
    }
  }

  return new ConfigManagerImpl(validated, configPath, options);
}
