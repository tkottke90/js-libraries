# Configuration Library Specification

## Overview

A standalone, framework-agnostic TypeScript library for loading, validating, and accessing
application configuration from YAML files, with environment variable support and Zod-based
schema validation.

---

## Goals

- Zero-config startup: a missing or empty config file produces a fully-populated default
- Schema-driven migration: adding new fields to a schema auto-heals old config files on next run
- Environment variable support: secrets can be injected via interpolation or runtime override
- Consumers receive typed values through a strongly-typed accessor API
- No framework coupling: the core library must not depend on Express or any HTTP framework

---

## Package Shape

```
config-lib/
  src/
    index.ts           ← public API
    loader.ts          ← file I/O & startup pipeline
    interpolate.ts     ← ${VAR} interpolation
    validate.ts        ← Zod validation + migration
    accessor.ts        ← ConfigAccessor class
    types.ts           ← public types & interfaces
  package.json
  tsconfig.json
```

---

## Startup Pipeline

```
loadConfig(options: LoadConfigOptions): ConfigAccessor
```

Internal steps executed in order:

1. Resolve config file path from `options.configDir` or `CONFIG_DIR` env var (fallback: `~/config/<appName>`)
2. `ensureConfigExists(path, rootSchema)` — create file from `rootSchema.parse({})` if absent
3. Read and `yaml.parse()` the file
4. `interpolateEnvVars(rawObject)` — replace `${UPPER_CASE}` tokens with `process.env` values
5. `validateAndMigrate(interpolated, rootSchema)` — validate, fill missing sections, save if changed
6. Inject caller-supplied runtime values (e.g. `appVersion`) into the data map
7. Return a `ConfigAccessor` wrapping the validated data

---

## Schema Construction Rules

Schemas are defined using Zod. The following conventions must be followed:

1. **Every field must have a `.default()`** — both at the field level and the `.object()` level.
   This ensures `schema.parse({})` always produces a complete default tree.

2. **One schema file per domain section** — compose them into a root schema.

3. **Export both the Zod schema and its inferred TypeScript type** from each schema file:

   ```typescript
   export const MySchema = z.object({ ... });
   export type MyConfig = z.infer<typeof MySchema>;
   ```

4. **The root schema** composes all section schemas:

   ```typescript
   export const RootSchema = z.object({
     server:  ServerSchema,
     logging: LoggingSchema,
     // ...
   });
   ```

---

## Environment Variable Interpolation

### Pre-processing (file-time)

`interpolateEnvVars(obj: unknown): unknown`

- Recursively walks the parsed YAML object
- Replaces `${UPPER_CASE_VAR}` patterns in string values with `process.env[UPPER_CASE_VAR]`
- Pattern: `/\$\{([A-Z_][A-Z0-9_]*)\}/g` — uppercase names only
- Missing variables: emit a `warn` log and substitute `""` (do not throw)
- Runs before Zod validation so secrets never appear in the validated output

### Runtime Override (call-time)

`ConfigAccessor.get(key)` must check `process.env[key]` before the in-memory data map.
Priority: **env var → config file → Zod default**.

---

## Validation and Migration

`validateAndMigrate(data, schema)`:

1. Parse an empty object through `schema` to get `defaults`
2. For each top-level key in `defaults` missing from `data`, copy the default value and set `changed = true`
3. Run `schema.safeParse(data)`
4. **On failure**: `_.merge({}, defaults, data)` then `schema.parse(merged)` — save result to disk, return it
5. **On success with changes**: save updated data to disk
6. **On success without changes**: return validated data, no disk write

---

## ConfigAccessor API

```typescript
interface ConfigAccessor {
  /** Raw in-memory snapshot. Avoid direct use; prefer typed methods. */
  readonly _data: Record<string, unknown>;

  /** Absolute path to the loaded config file. */
  readonly configPath: string;

  /**
   * Retrieve a value by lodash dot-path key.
   * Checks process.env[key] first, then _data, then defaultValue.
   */
  get(key: string, defaultValue?: string): string;

  /** get() parsed as integer. Returns defaultValue if NaN. */
  getNumber(key: string, defaultValue?: number): number;

  /** get() === 'true' */
  getBoolean(key: string, defaultValue?: boolean): boolean;

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
  loadConfig<T extends z.ZodTypeAny>(key: string, schema: T): z.infer<T>;
}
```

---

## LoadConfigOptions

```typescript
interface LoadConfigOptions {
  /** Application name; used as default config directory name. */
  appName: string;

  /** Root Zod schema for the entire config file. */
  schema: z.ZodTypeAny;

  /**
   * Override the config directory path.
   * Falls back to CONFIG_DIR env var, then ~/config/<appName>.
   */
  configDir?: string;

  /**
   * Additional key/value pairs injected into _data after validation.
   * Useful for build-time constants (appVersion, etc.).
   * These are NOT written to the YAML file.
   */
  runtimeValues?: Record<string, unknown>;
}
```

---

## Restart Behavior

| Change type | Restart required? |
|---|---|
| `config.yaml` edited on disk | Yes — no file watcher, snapshot is taken once at startup |
| `process.env[key]` changed | No — `get()` reads `process.env` on every call |
| `${VAR}` value in YAML changed | Yes — interpolation only runs at startup |

Config is intentionally immutable after startup. Applications that need live reload should
call `loadConfig()` again and replace the `ConfigAccessor` instance — this library does not
manage that lifecycle.

---

## Error Handling

| Situation | Behavior |
|---|---|
| Config directory missing | Create it recursively |
| Config file missing | Write defaults from `schema.parse({})` |
| Zod validation failure | Merge defaults, re-validate, save, continue |
| `loadConfig(key)` key not found | Throw `Error` |
| `loadConfig(key)` Zod failure | Log formatted errors, throw `Error` |
| `${VAR}` not in `process.env` | `console.warn`, substitute `""` |

---

## What This Library Does Not Do

- Hot-reload or file watching
- Config write-back via an HTTP API (that is the application's responsibility)
- Framework binding (no Express augmentation in the core library)
- Secret management beyond env var interpolation
