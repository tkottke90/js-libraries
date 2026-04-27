import type { ZodTypeAny, infer as ZodInfer } from 'zod';

export interface LoadConfigOptions {
  /** Application name; used as default config directory name. */
  appName: string;

  /** Root Zod schema for the entire config file. */
  schema: ZodTypeAny;

  /**
   * Override the config directory path.
   * Falls back to CONFIG_DIR env var, then ~/config/<appName>.
   */
  configDir?: string;

  /**
   * Additional key/value pairs injected into _data after validation.
   * Useful for build-time constants (appVersion, etc.).
   * These are NOT written to the config file.
   */
  runtimeValues?: Record<string, unknown>;
}

export interface ConfigManager {
  /** Raw in-memory snapshot. Avoid direct use; prefer typed methods. */
  readonly _data: Record<string, unknown>;

  /** Absolute path to the loaded config file. */
  readonly configPath: string;

  /**
   * Retrieve a value by lodash dot-path key.
   * Checks process.env[key] first, then _data, then defaultValue.
   */
  get(key: string, defaultValue?: string): string | undefined;

  /** get() parsed as integer. Returns defaultValue if NaN. */
  getNumber(key: string, defaultValue?: number): number | undefined;

  /** get() === 'true' */
  getBoolean(key: string, defaultValue?: boolean): boolean | undefined;

  /** Returns true if get(key) is non-empty. */
  has(key: string): boolean;

  /**
   * Resolves a sub-path relative to the config file's directory.
   * Creates the directory if it does not exist.
   */
  getConfigDir(subPath?: string): string;

  /**
   * Reads a config section by dot-path key and validates it against a Zod schema.
   * Throws if the key is missing or validation fails.
   */
  getSection<T extends ZodTypeAny>(key: string, schema: T): ZodInfer<T>;

  /**
   * Set a value by lodash dot-path key in the in-memory data map.
   * Does NOT persist to disk — call save() to persist.
   */
  set(key: string, value: unknown): void;

  /** Persist the current in-memory data map to the config file on disk. */
  save(): void;

  /**
   * Re-run the full startup pipeline (read → interpolate → validate → inject runtimeValues).
   * Updates _data and configPath in-place.
   */
  reload(): void;
}
