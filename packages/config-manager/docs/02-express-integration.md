# Express Integration

This guide explains how to attach the config manager to an Express `Application` instance so it is available throughout your app via `app.config`.

---

## Overview

Express does not natively support typed custom properties on its `Application` object. To add `app.config` in a type-safe way you need to:

1. Extend the Express `Application` interface with a TypeScript declaration merge.
2. Call the setup function at startup to create the config object and set it on `app`.

---

## Step 1 — Augment the Express TypeScript Interface

Create (or add to) a global type declaration file. A common convention is `src/lib/types/application.ts` or `src/@types/express/index.d.ts`.

```typescript
// src/lib/types/application.ts
import z from 'zod';

declare global {
  namespace Express {
    interface Application {
      config: {
        /** Raw parsed config data — prefer the typed getters below. */
        _configData: Record<string, any>;

        /** Absolute path to the loaded config file. */
        configPath: string;

        /**
         * Returns a config value as a string.
         * Checks environment variables first, then the config file, then the default.
         */
        get(key: string, defaultValue?: string): string;

        /** Returns a config value parsed as a boolean. */
        getBoolean(key: string, defaultValue?: boolean): boolean;

        /** Returns a config value parsed as a number. */
        getNumber(key: string, defaultValue?: number): number;

        /**
         * Returns the absolute path of a sub-directory inside the config directory,
         * creating it if it does not already exist.
         */
        getConfigDir(subPath?: string): string;

        /** Returns true if the key is present in env vars or the config file. */
        has(key: string): boolean;

        /**
         * Loads a config section, validates it against a Zod schema, and returns
         * the typed result. Throws if the key is missing or validation fails.
         */
        loadConfig<T>(key: string, schema: T): T extends z.ZodTypeAny ? z.infer<T> : any;
      };
    }
  }
}
```

> **TypeScript note:** This file must be included in your `tsconfig.json` `include` glob (or imported somewhere in your build graph) for the augmentation to take effect. No explicit import is needed at the call sites — once the file is compiled, `app.config` is typed everywhere.

---

## Step 2 — Create the Setup Function

Write a function that builds the config object and assigns it to `app.config`. This keeps the initialization logic in one place and makes `app.ts` easy to read.

```typescript
// src/lib/config.ts
import { Application } from 'express';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import yaml from 'yaml';
import _ from 'lodash';
import z from 'zod';
import initializeConfig from '@tkottke90/config-manager';

export default function setupConfig(app: Application): void {
  const configDir = path.resolve(
    process.env.CONFIG_DIR ?? path.join(os.homedir(), 'config/my-app')
  );
  const configFilePath = path.join(configDir, 'config.yaml');

  // Ensure the config file exists (create from defaults if not)
  ensureConfigExists(configFilePath);

  // Load, interpolate env vars, and validate
  const raw = yaml.parse(fs.readFileSync(configFilePath, 'utf-8'));
  const configData = validateConfig(configFilePath, interpolateEnvVars(raw));

  // Attach the config object to the Express app
  app.config = {
    _configData: configData,
    configPath: configFilePath,

    get(key, defaultValue = '') {
      const envValue = process.env[key];
      if (envValue !== undefined) return envValue;
      return _.get(this._configData, key, defaultValue);
    },

    getBoolean(key, defaultValue = false) {
      return this.get(key, String(defaultValue)) === 'true';
    },

    getNumber(key, defaultValue = 0) {
      const num = parseInt(this.get(key, String(defaultValue)), 10);
      return isNaN(num) ? defaultValue : num;
    },

    getConfigDir(subPath = '') {
      const fullPath = path.resolve(path.dirname(this.configPath), subPath);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
      return fullPath;
    },

    has(key) {
      return this.get(key) !== '';
    },

    loadConfig(key, schema) {
      const value = _.get(this._configData, key);
      if (value === undefined) throw new Error(`Config key "${key}" not found`);
      if (schema instanceof z.ZodType) {
        const result = schema.safeParse(value);
        if (!result.success) throw new Error(`Config key "${key}" failed validation`);
        return result.data;
      }
      return value;
    },
  };
}
```

---

## Step 3 — Call the Setup Function in `app.ts`

Call `setupConfig` before any code that reads from `app.config`. This is typically the very first thing that runs after creating the Express application.

```typescript
// src/app.ts
import express from 'express';
import setupConfig from './lib/config';
import setupLogger from './lib/logger';

export const app = express();

// Config must be first — logger and other services depend on it
setupConfig(app);
setupLogger(app);

// ... rest of middleware and controllers
```

---

## Usage Throughout the App

After `setupConfig` runs, any module that receives the `app` object (or imports it) can access config values:

```typescript
import { app } from '../app';

// In a startup function
const host = app.config.get('server.host', 'localhost');
const port = app.config.getNumber('server.port', 3000);

app.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`);
});
```

```typescript
// In a route handler via the request object
import { Request, Response } from 'express';

export function healthCheck(req: Request, res: Response) {
  const version = req.app.config.get('appVersion');
  res.json({ status: 'ok', version });
}
```

---

## `app` vs `req.app`

Both `app` and `req.app` refer to the same Express `Application` instance, so `req.app.config` works anywhere you have a request object without needing to import `app` directly. This is useful in controllers and middleware.

---

## Complete Type Reference

| Method                      | Return type    | Notes                                          |
|-----------------------------|----------------|------------------------------------------------|
| `get(key, default?)`        | `string`       | Env var → config file → default                |
| `getBoolean(key, default?)` | `boolean`      | Parses `"true"` / `"false"` strings            |
| `getNumber(key, default?)`  | `number`       | Parses with `parseInt`; falls back to default on `NaN` |
| `getConfigDir(subPath?)`    | `string`       | Creates the directory if missing               |
| `has(key)`                  | `boolean`      | `false` if value resolves to `""`              |
| `loadConfig(key, schema)`   | `z.infer<T>`   | Throws on missing key or schema mismatch       |
