---
applyTo: packages/config-manager/**
---

# config-manager — Copilot Instructions

## Package Purpose

File-based configuration manager for Node.js. Reads YAML or JSON config files, validates them with Zod, interpolates `${ENV_VAR}` tokens, supports write-back and reload, and exposes a typed `ConfigManager` interface.

---

## Module System

- The package uses `"module": "nodenext"` (TypeScript `moduleResolution: "nodenext"`).
- **All internal imports must use `.js` extensions**, even when importing `.ts` source files.
  ```ts
  import { loadConfig } from './loader.js'; // correct
  import { loadConfig } from './loader';    // WRONG — breaks at runtime
  ```

---

## Public API (`src/index.ts`)

```ts
export type { ConfigManager, LoadConfigOptions } from './lib/types.js';
export { loadConfig } from './lib/loader.js';
export { ConfigManagerImpl } from './lib/config-manager.js';
export { formatZodErrors } from './lib/validate.js';
```

Only these four exports are public. Do not add new top-level exports without updating `src/index.ts`.

---

## Source File Map

| File | Responsibility |
|---|---|
| `src/lib/types.ts` | `LoadConfigOptions` interface + `ConfigManager` interface |
| `src/lib/format.ts` | YAML/JSON file read/write; `detectFormat`, `readConfigFile`, `writeConfigFile` |
| `src/lib/interpolate.ts` | Recursive `${UPPER_CASE}` env var substitution via `interpolateEnvVars` |
| `src/lib/validate.ts` | `formatZodErrors`, `validateAndMigrate` — Zod validation + default migration + file write-back |
| `src/lib/path-utils.ts` | `resolveConfigPath`, `ensureConfigExists` — extracted to avoid circular dep between `loader.ts` ↔ `config-manager.ts` |
| `src/lib/loader.ts` | `loadConfig()` entry point — orchestrates the full startup pipeline |
| `src/lib/config-manager.ts` | `ConfigManagerImpl` class — the live config instance |

**Do not collapse `path-utils.ts` back into `loader.ts` or `config-manager.ts`.** The extraction exists specifically to break a circular dependency: `loader.ts` imports `ConfigManagerImpl`, and `ConfigManagerImpl.reload()` needs the path helpers. If they lived in `loader.ts`, that would be a cycle.

---

## Key Behaviors & Invariants

### `loadConfig()` Pipeline (do not reorder steps)
1. `resolveConfigPath(options)` — determine file path
2. `ensureConfigExists(configPath, schema)` — create file with defaults if missing
3. `readConfigFile(configPath)` — parse YAML or JSON
4. `interpolateEnvVars(raw)` — substitute `${ENV_VAR}` tokens
5. `validateAndMigrate(interpolated, schema, configPath)` — fill defaults, validate, recover, save if changed
6. Inject `runtimeValues` into the validated data map
7. `return new ConfigManagerImpl(validated, configPath, options)`

### `get()` Priority Order
`process.env[key]` → `_data[key]` (via lodash dot-path) → `defaultValue`

Environment variables **always win** over file values. This is intentional and must not be changed.

### `validateAndMigrate()` Recovery Strategy
1. Fill missing top-level keys from `schema.parse({})` defaults
2. `schema.safeParse(data)` — if valid, return (write file if any keys were added)
3. On failure: log `formatZodErrors`, attempt `merge({}, data, defaults)` and re-parse
4. If merge still fails: fall back to pure `schema.parse({})` defaults
5. Write the recovered data to disk

The recovery merge order is `merge({}, data, defaults)` — defaults win for type conflicts. This is intentional.

### `ConfigManagerImpl.reload()`
Re-runs steps 1–6 of the pipeline in-place using the stored `_options`. Updates `this._data` and `this.configPath` without replacing the instance.

---

## Dependencies

All dependencies live in the **root `package.json`**, not in `packages/config-manager/package.json`. This is an NX monorepo convention for this workspace.

| Package | Version | Usage |
|---|---|---|
| `zod` | `^4.3.6` | Schema definition and validation |
| `yaml` | `^2.7.1` | YAML parse/stringify |
| `lodash` | `^4.17.21` | `get`, `set`, `merge` via subpath imports |
| `@types/lodash` | `^4.17.0` | devDependency |

### lodash Import Style
Always use subpath imports — **never** `import _ from 'lodash'`:
```ts
import get from 'lodash/get.js';
import set from 'lodash/set.js';
import merge from 'lodash/merge.js';
```

---

## Schema Requirements

Every Zod schema passed to this package **must** have `.default()` on every field and every nested `.object()`. This is required so `schema.parse({})` can generate a valid default config file on first run.

```ts
// Correct
const Schema = z.object({
  port: z.number().default(3000),
  db: z.object({ host: z.string().default('localhost') }).default({}),
});

// Wrong — will throw when trying to generate defaults
const Schema = z.object({
  port: z.number(),
});
```

---

## File Format Rules

- Supported extensions: `.yaml`, `.yml`, `.json`
- `detectFormat()` throws on any other extension — do not silently fall back
- Auto-created config files are written in the format implied by the resolved file extension (`.yaml`/`.yml` → YAML, `.json` → JSON)
- `writeConfigFile` detects format from `filePath` extension, same as `readConfigFile`

---

## Environment Variable Interpolation

- Pattern: `/\$\{([A-Z_][A-Z0-9_]*)\}/g` — only `UPPER_CASE` names match
- Applied recursively to all string values in the parsed config object
- Numbers, booleans, null, arrays are passed through unchanged
- Missing env vars: substitute `""` and log a `console.warn` — do **not** throw

---

## Test Conventions

- Test runner: Vitest v4 with `globals: true`
- Use `vi.stubEnv(key, value)` for environment variable injection in tests
- Use `vi.spyOn(module, 'functionName')` for mocking module functions — requires `import * as module from './module.js'`
- All `it()` callbacks that use `await` must be declared `async`
- Use `afterEach(() => vi.restoreAllMocks())` to clean up spies

---

## TypeScript Strictness

The package is compiled with:
- `strict: true`
- `noUnusedLocals: true`
- `noImplicitReturns: true`
- `noImplicitOverride: true`
- `target: es2022`

Every function must have an explicit return type. Unused imports and variables are compile errors.
