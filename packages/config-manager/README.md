# config-manager

A file-based configuration manager for Node.js applications. Reads YAML or JSON config files, validates them with [Zod](https://zod.dev), interpolates environment variables, and exposes a typed `ConfigManager` interface.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Schema Setup](#schema-setup)
- [Configuration File](#configuration-file)
- [ConfigManager API](#configmanager-api)
- [Environment Variable Interpolation](#environment-variable-interpolation)
- [File Formats](#file-formats)
- [Framework Integrations](#framework-integrations)
  - [Express](#express)
  - [Hono](#hono)
- [Building & Testing](#building--testing)

---

## Installation

This package is part of the `js-helper-packages` monorepo. Add it as a dependency in your project:

```bash
npm install @tkottke90/config-manager
```

`@tkottke90/config-manager` installs `zod` automatically. If your application imports `zod` directly to define schemas (as shown in the examples below), add `zod` (v4+) to your project's dependencies as well.

---

## Quick Start

```ts
import { z } from 'zod';
import { loadConfig } from '@tkottke90/config-manager';

const AppConfigSchema = z.object({
  port: z.number().default(3000),
  database: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    name: z.string().default('myapp'),
  }).default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

const config = loadConfig({
  appName: 'my-app',
  schema: AppConfigSchema,
});

const port = config.getNumber('port'); // 3000
const dbHost = config.get('database.host'); // 'localhost'
```

`loadConfig` will:
1. Resolve the config file path (see [File Path Resolution](#configmanager-api))
2. Create the file with schema defaults if it does not exist
3. Parse the file (YAML or JSON)
4. Validate and migrate the data against the schema (filling in any new defaults)
5. Substitute `${ENV_VAR}` tokens with environment variable values
6. Return a `ConfigManager` instance

---

## Schema Setup

Define your schema using Zod. Every field and every nested object **must** have a `.default()` so that a valid config file can be generated automatically on first run.

```ts
import { z } from 'zod';

// Define section schemas separately for reuse with getSection()
export const DatabaseSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(5432),
  name: z.string().default('myapp'),
  ssl:  z.boolean().default(false),
}).default({});

export const LoggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  pretty: z.boolean().default(false),
}).default({});

export const AppConfigSchema = z.object({
  port:     z.number().default(3000),
  database: DatabaseSchema,
  logging:  LoggingSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
```

### Using `getSection()`

Retrieve and validate a config section independently:

```ts
import { DatabaseSchema } from './config-schema.js';

const db = config.getSection('database', DatabaseSchema);
// db is fully typed as z.infer<typeof DatabaseSchema>

console.log(db.host); // 'localhost'
```

`getSection` throws if the key is missing or if validation fails. The error message includes a human-readable summary of all Zod validation issues.

---

## Configuration File

### File Path Resolution

The config file path is resolved in this order:

1. `configDir` option passed to `loadConfig`
2. `CONFIG_DIR` environment variable
3. `~/config/<appName>`

If the resolved path is a directory (no file extension), `config.yaml` is appended automatically.

```ts
// Explicit path
const config = loadConfig({
  appName: 'my-app',
  schema: AppConfigSchema,
  configDir: '/etc/my-app',
  // Resolves to: /etc/my-app/config.yaml
});
```

### Runtime Values

Inject build-time or runtime constants into `_data` without writing them to the config file:

```ts
const config = loadConfig({
  appName: 'my-app',
  schema: AppConfigSchema,
  runtimeValues: {
    appVersion: process.env.APP_VERSION ?? 'dev',
    buildDate: new Date().toISOString(),
  },
});

config.get('appVersion'); // 'dev'
```

---

## ConfigManager API

| Method | Description |
|---|---|
| `get(key, default?)` | Returns the value at the dot-path `key` as a string. Checks `process.env[key]` first, then `_data`. |
| `getNumber(key, default?)` | Parses the value as a number. Returns `defaultValue` if the result is `NaN`. |
| `getBoolean(key, default?)` | Returns `true` if `get(key) === 'true'`. |
| `has(key)` | Returns `true` if `get(key)` is non-empty. |
| `getSection(key, schema)` | Returns the sub-object at `key` validated against `schema`. Throws on failure. |
| `getConfigDir(subPath?)` | Returns the directory of the config file, optionally joining `subPath`. Creates the directory if it does not exist. |
| `set(key, value)` | Sets a value at dot-path `key` in memory. Does **not** persist to disk. |
| `save()` | Writes the current in-memory data to the config file on disk. |
| `reload()` | Re-runs the full startup pipeline and updates the in-memory data in-place. |
| `configPath` | Absolute path to the loaded config file. |
| `_data` | Raw in-memory config snapshot. Prefer typed accessor methods over direct access. |

### Writing and Persisting Values

```ts
config.set('logging.level', 'debug');
config.save(); // writes to disk
```

### Reloading

```ts
// Pick up external changes to the config file at runtime
config.reload();
```

---

## Environment Variable Interpolation

Any string value in the config file can reference an environment variable using `${UPPER_CASE}` syntax:

```yaml
# config.yaml
database:
  host: ${DB_HOST}
  password: ${DB_PASSWORD}
port: 3000
```

When the file is loaded, `${DB_HOST}` is replaced with the value of `process.env.DB_HOST`. If the variable is not set, it is substituted with an empty string and a warning is logged.

Values set in `process.env` also take precedence over `_data` when using `get()`:

```ts
process.env['port'] = '8080';
config.get('port'); // '8080' — env wins
```

---

## File Formats

Both YAML and JSON config files are supported. The format is detected from the file extension:

| Extension | Format |
|---|---|
| `.yaml`, `.yml` | YAML |
| `.json` | JSON |

When a config file is auto-created (first run), it is written in the format implied by the resolved file extension. For example, `.yaml`/`.yml` paths are created as YAML, and `.json` paths are created as JSON.

---

## Framework Integrations

### Express

Use TypeScript [module augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) to add a `config` property to the Express `Application` type, then assign the `ConfigManager` instance during app setup.

**`src/types/express.d.ts`**

```ts
import type { ConfigManager } from '@tkottke90/config-manager';

declare global {
  namespace Express {
    interface Application {
      config: ConfigManager;
    }
  }
}
```

**`src/app.ts`**

```ts
import express from 'express';
import { loadConfig } from '@tkottke90/config-manager';
import { AppConfigSchema } from './config-schema.js';

const app = express();

app.config = loadConfig({
  appName: 'my-app',
  schema: AppConfigSchema,
});

// Access config in route handlers or middleware via req.app.config
app.get('/health', (req, res) => {
  res.json({ version: req.app.config.get('appVersion') });
});
```

### Hono

Hono exposes a typed [context variables](https://hono.dev/docs/guides/middleware#context-variables) mechanism. Define a `Variables` type with your `ConfigManager` and pass it as a generic to `new Hono()`.

**`src/app.ts`**

```ts
import { Hono } from 'hono';
import type { ConfigManager } from '@tkottke90/config-manager';
import { loadConfig } from '@tkottke90/config-manager';
import { AppConfigSchema } from './config-schema.js';

type Variables = {
  config: ConfigManager;
};

const app = new Hono<{ Variables: Variables }>();

const config = loadConfig({
  appName: 'my-app',
  schema: AppConfigSchema,
});

// Inject config into every request context via middleware
app.use('*', async (c, next) => {
  c.set('config', config);
  await next();
});

// Access in route handlers
app.get('/health', (c) => {
  const cfg = c.get('config');
  return c.json({ version: cfg.get('appVersion') });
});
```

---

## Building & Testing

```bash
# Build the library
nx build config-manager

# Run unit tests
nx test config-manager
```
