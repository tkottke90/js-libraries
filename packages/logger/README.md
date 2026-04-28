# @tkottke90/logger

A structured logging library built on top of [Winston](https://github.com/winstonjs/winston). It provides helper functions for creating and configuring loggers with transports (console, file, Grafana Loki), child logger support, and a [Zod](https://zod.dev)-based configuration schema for integration with config managers.

## Installation and Setup

```bash
npm install @tkottke90/logger
```

After installing, configure the logger before your application starts handling requests:

```ts
import { configureFromSchema } from '@tkottke90/logger';

configureFromSchema('my-app', {
  level: 'info',
  console: { enabled: true },
  file: {
    log: { filename: '/var/log/app/app.jsonl' },
    error: { filename: '/var/log/app/error.jsonl' },
  },
  grafana: {
    url: 'http://localhost:3100',
  },
});
```

If Grafana Loki, console, or file transports are not needed, omit those keys entirely.

---

## Configuration

### Environment Variables

| Variable              | Description                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| `LOGGER_GRAFANA_URL`  | Grafana Loki host URL. Takes precedence over `grafana.url` when both are provided. |

### Config Schema

The library exports Zod schemas for use with a config manager or for manual validation.

#### `LoggerConfigSchema`

| Field          | Type                                        | Default  | Description                                                       |
|----------------|---------------------------------------------|----------|-------------------------------------------------------------------|
| `level`        | `'foobar' \| 'error' \| 'warn' \| 'notify' \| 'info' \| 'event' \| 'debug'` | `'info'` | Minimum log level for the logger instance. |
| `console`      | `ConsoleConfigSchema` (optional)            | —        | When provided, configures the console transport.                  |
| `file.log`     | `FileConfigSchema` (optional)               | —        | When provided, adds a JSON Lines file transport for all log levels. |
| `file.error`   | `FileConfigSchema` (optional)               | —        | When provided, adds a JSON Lines file transport for error-level logs only. |
| `grafana`      | `GrafanaLokiConfigSchema` (optional)        | —        | When provided, a Grafana Loki transport is added to the logger.   |

```ts
import { LoggerConfigSchema } from '@tkottke90/logger';

const config = LoggerConfigSchema.parse(rawConfig);
```

### Console Config

#### `ConsoleConfigSchema`

| Field    | Type                | Default  | Description                                          |
|----------|---------------------|----------|------------------------------------------------------|
| `enabled`| `boolean`           | `true`   | Enable or disable the console transport.             |
| `level`  | log level (optional)| —        | Override the log level for the console transport.    |

### File Config

#### `FileConfigSchema`

Used for both `file.log` and `file.error`.

| Field      | Type                | Default | Description                                             |
|------------|---------------------|---------|---------------------------------------------------------|
| `enabled`  | `boolean`           | `true`  | Enable or disable the file transport.                   |
| `filename` | `string`            | —       | Path to the log file.                                   |
| `level`    | log level (optional)| —       | Override the log level for this transport.              |

### Grafana Loki Config

#### `GrafanaLokiConfigSchema`

| Field   | Type              | Description                                                                       |
|---------|-------------------|-----------------------------------------------------------------------------------|
| `url`   | `string` (optional) | Grafana Loki host URL. Falls back to `LOGGER_GRAFANA_URL` env var if omitted.   |
| `level` | `'foobar' \| 'error' \| 'warn' \| 'notify' \| 'info' \| 'event' \| 'debug'` (optional) | Override the log level for the Grafana Loki transport specifically. |

```ts
import { GrafanaLokiConfigSchema } from '@tkottke90/logger';

const grafanaConfig = GrafanaLokiConfigSchema.parse({ url: 'http://localhost:3100' });
```

---

## Usage

### Configure from schema

The recommended way to initialise the logger. Accepts an app name (used as the Grafana job label), validates the config with Zod, and returns a configured Winston logger instance with transports for each enabled key.

```ts
import { configureFromSchema } from '@tkottke90/logger';

const logger = configureFromSchema('my-app', {
  level: 'debug',
  console: { enabled: true, level: 'info' },
  file: {
    log: { filename: '/var/log/app/app.jsonl' },
    error: { filename: '/var/log/app/error.jsonl' },
  },
  grafana: { url: 'http://localhost:3100', level: 'warn' },
});

logger.info('Server started', { port: 3000 });
```

A `ZodError` is thrown if the config is invalid (including when `grafana` is provided but no URL can be resolved — i.e., `grafana.url` is absent and `LOGGER_GRAFANA_URL` is not set).

### Create a child logger

Child loggers inherit the parent's transports and append to the name hierarchy:

```ts
import { createChildLogger } from '@tkottke90/logger';

const appLogger = createChildLogger('app', logger);          // name: 'app'
const dbLogger = createChildLogger('db', appLogger);         // name: 'app.db'

dbLogger.info('Connected to database');
```

### Update log level at runtime

The log level can be changed without restarting the application — existing transports are preserved:

```ts
import { updateLogLevel } from '@tkottke90/logger';

updateLogLevel('debug', logger);
```

### Add file transports

```ts
import { addFileLogger, addErrorFileLogger } from '@tkottke90/logger';

// JSON Lines format for all log levels
addFileLogger('/var/log/app/app.jsonl');

// JSON Lines format, error level only — with rotation (10 MB max, 5 files, tailable)
addErrorFileLogger('/var/log/app/error.jsonl');
```

### Add Grafana Loki transport manually

Use when you need direct control over the app name or transport options outside of `configureFromSchema`:

```ts
import { addGrafanaLokiLogger } from '@tkottke90/logger';

addGrafanaLokiLogger('my-app', { url: 'http://localhost:3100', level: 'info' });
```

The `url` falls back to the `LOGGER_GRAFANA_URL` environment variable if not provided. Throws `InvalidGrafanaConfig` if no URL can be resolved.

---

## Development

Run unit tests:

```bash
nx run @tkottke90/logger:test
```

Build the library:

```bash
nx run @tkottke90/logger:build
```
