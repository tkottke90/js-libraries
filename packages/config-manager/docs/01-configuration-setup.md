# Configuration Setup

This guide covers how to set up and configure `@tkottke90/config-manager` for both local development and production environments.

---

## Installation

```bash
npm install @tkottke90/config-manager
```

---

## Overview

The config manager loads a YAML configuration file from a directory on disk. Which directory it uses depends on how you configure it — typically via an environment variable — so the same code works in development and production without changes.

---

## Config Directory Resolution

The config directory is resolved using the following precedence:

1. **`CONFIG_DIR` environment variable** — if set, this path is used as-is.
2. **Fallback default** — if the environment variable is not set, a default path is used (e.g. `~/config/<app-name>`).

### Development

During development it is convenient to keep the config file in the project repository under a `config/` directory. Set `CONFIG_DIR` in your local `.env` file:

```env
# .env (development only — do not commit)
CONFIG_DIR=./config
```

This tells the config manager to read from `<project-root>/config/config.yaml`.

> **Tip:** Add `config/config.yaml` to `.gitignore` and commit a `config.example.yaml` instead so developers can copy it to get started without accidentally checking in secrets.

### Production

In production, omit `CONFIG_DIR` or point it at a stable directory outside the application source tree:

```env
# Production environment (set in your deployment platform / systemd unit / Docker env)
CONFIG_DIR=/etc/my-app
```

The config file will be read from `/etc/my-app/config.yaml`.

If the directory or file does not exist, the config manager creates them on first run using built-in defaults, so no manual bootstrapping is required.

---

## Initialization

Call the setup function early in your application startup, before any code that needs config values.

```typescript
import initializeConfig from '@tkottke90/config-manager';
import path from 'node:path';
import os from 'node:os';

const configDir = process.env.CONFIG_DIR ?? path.join(os.homedir(), 'config/my-app');

initializeConfig(configDir);
```

### What happens at startup

1. The config directory is created if it does not exist.
2. A `config.yaml` file is created from defaults if it is missing.
3. The YAML file is read and parsed.
4. Environment variable interpolation is applied — any `${VAR_NAME}` placeholders in string values are replaced with the matching `process.env` value. This keeps secrets out of the config file itself.
5. The config is validated against the application's schema and any missing sections are added from defaults (automatic migration).
6. The validated config object is made available for use.

---

## Environment Variable Interpolation

String values in `config.yaml` can reference environment variables using `${VAR_NAME}` syntax:

```yaml
llm:
  apis:
    - alias: openai
      provider: openai
      apiKey: ${OPENAI_API_KEY}
```

At startup, `${OPENAI_API_KEY}` is replaced with `process.env.OPENAI_API_KEY`. If the variable is not set, an empty string is substituted and a warning is printed to the console.

Only uppercase variable names are supported (`[A-Z_][A-Z0-9_]*`).

---

## Reading Config Values

Once initialized, use the config object to read values:

```typescript
// String value with optional default
const host = config.get('server.host', 'localhost');

// Numeric value
const port = config.getNumber('server.port', 3000);

// Boolean value
const toFile = config.getBoolean('logging.toFile', false);

// Check if a key exists
if (config.has('llm.apis')) { ... }

// Load and validate a config section against a Zod schema
import { z } from 'zod';
const LogSchema = z.object({ level: z.string(), toConsole: z.boolean() });
const logging = config.loadConfig('logging', LogSchema);
```

### Key lookup order for `get()`

1. `process.env[key]` — environment variable takes precedence over the file.
2. The parsed YAML value at the dot-notation path.
3. The provided `defaultValue` (or empty string if none given).

This lets you override any config value at runtime without editing the file, which is useful in containers and CI environments.

---

## Sub-directories

Use `getConfigDir()` to resolve paths relative to the config directory. The method creates the directory if it does not exist:

```typescript
// Returns <configDir>/logs — creating it if needed
const logDir = config.getConfigDir('logs');

// Returns <configDir> itself
const configDir = config.getConfigDir();
```

This is useful for log files, asset directories, or any other runtime data that should live alongside the config file.

---

## Config File Location Summary

| Environment | Recommended `CONFIG_DIR`   | Config file path                    |
|-------------|----------------------------|-------------------------------------|
| Development | `./config` (set in `.env`) | `<project-root>/config/config.yaml` |
| Production  | `/etc/my-app` or similar   | `/etc/my-app/config.yaml`           |
| Default     | *(not set)*                | `~/config/my-app/config.yaml`       |
