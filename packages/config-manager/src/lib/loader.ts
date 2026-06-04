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
  const validated = validateAndMigrate(
    raw,
    options.schema,
    configPath,
    options.writeBack ?? true,
    options.onCorruptConfig ?? 'recover'
  );
  const runtimeConfig = interpolateEnvVars(validated) as Record<string, unknown>;

  if (options.runtimeValues) {
    for (const [key, value] of Object.entries(options.runtimeValues)) {
      runtimeConfig[key] = value;
    }
  }

  return new ConfigManagerImpl(runtimeConfig, configPath, options);
}
