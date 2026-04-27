import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import get from 'lodash/get.js';
import set from 'lodash/set.js';
import type { ConfigManager, LoadConfigOptions } from './types.js';
import { readConfigFile, writeConfigFile } from './format.js';
import { interpolateEnvVars } from './interpolate.js';
import { validateAndMigrate, formatZodErrors } from './validate.js';
import { resolveConfigPath, ensureConfigExists } from './path-utils.js';

export class ConfigManagerImpl implements ConfigManager {
  _data: Record<string, unknown>;
  configPath: string;
  private readonly _options: LoadConfigOptions;

  constructor(
    data: Record<string, unknown>,
    configPath: string,
    options: LoadConfigOptions
  ) {
    this._data = data;
    this.configPath = configPath;
    this._options = options;
  }

  get(key: string, defaultValue?: string): string | undefined {
    const envValue = process.env[key];
    if (envValue !== undefined) return envValue;

    const dataValue = get(this._data, key);
    if (dataValue !== undefined) return String(dataValue);

    return defaultValue;
  }

  getNumber(key: string, defaultValue?: number): number | undefined {
    const raw = this.get(key);
    if (raw === undefined) return defaultValue;
    const parsed = Number(raw);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean | undefined {
    const raw = this.get(key);
    if (raw === undefined) return defaultValue;
    return raw === 'true';
  }

  has(key: string): boolean {
    const value = this.get(key);
    return value !== undefined && value !== '';
  }

  getConfigDir(subPath?: string): string {
    const base = dirname(this.configPath);
    const target = subPath ? resolve(join(base, subPath)) : base;

    if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
    }

    return target;
  }

  getSection<T extends ZodTypeAny>(key: string, schema: T): ZodInfer<T> {
    const section = get(this._data, key);
    if (section === undefined) {
      throw new Error(`[config-manager] getSection: key "${key}" not found in config.`);
    }

    const result = schema.safeParse(section);
    if (!result.success) {
      const formatted = formatZodErrors(result.error.issues);
      console.error(formatted);
      throw new Error(`[config-manager] getSection: validation failed for key "${key}".\n${formatted}`);
    }

    return result.data as ZodInfer<T>;
  }

  set(key: string, value: unknown): void {
    set(this._data, key, value);
  }

  save(): void {
    writeConfigFile(this.configPath, this._data);
  }

  reload(): void {
    const configPath = resolveConfigPath(this._options);
    ensureConfigExists(configPath, this._options.schema);

    const raw = readConfigFile(configPath);
    const interpolated = interpolateEnvVars(raw) as Record<string, unknown>;
    const validated = validateAndMigrate(interpolated, this._options.schema, configPath);

    if (this._options.runtimeValues) {
      for (const [key, value] of Object.entries(this._options.runtimeValues)) {
        validated[key] = value;
      }
    }

    this._data = validated;
    this.configPath = configPath;
  }
}
