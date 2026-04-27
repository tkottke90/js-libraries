# @tkottke90/logger

A structured logging library built on top of [Winston](https://github.com/winstonjs/winston). It provides a pre-configured module-level logger instance, helper functions for adding transports (file, JSON Lines, Grafana Loki), child logger support, and a [Zod](https://zod.dev)-based configuration schema for integration with config managers.

## Installation and Setup

```bash
npm install @tkottke90/logger
```

After installing, configure the logger before your application starts handling requests:

```ts
import { configureFromSchema } from '@tkottke90/logger';

configureFromSchema('my-app', {
  level: 'info',
  grafana: {
    url: 'http://localhost:3100',
  },
});
```

If Grafana Loki is not needed, omit the `grafana` key entirely.

---

## Configuration

### Environment Variables

| Variable              | Description                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| `LOGGER_GRAFANA_URL`  | Grafana Loki host URL. Used when `grafana.url` is not provided in the schema config. |

### Config Schema

The library exports two Zod schemas for use with a config manager or for manual validation.

#### `LoggerConfigSchema`

| Field     | Type                                        | Default  | Description                                                       |
|-----------|---------------------------------------------|----------|-------------------------------------------------------------------|
| `level`   | `'foobar' \| 'error' \| 'warn' \| 'notify' \| 'info' \| 'event' \| 'debug'` | `'info'` | Minimum log level for the logger instance. |
| `grafana` | `GrafanaLokiConfigSchema` (optional)        | —        | When provided, a Grafana Loki transport is added to the logger.   |

```ts
import { LoggerConfigSchema } from '@tkottke90/logger';

const config = LoggerConfigSchema.parse(rawConfig);
```

### Grafana Loki Config

#### `GrafanaLokiConfigSchema`

| Field   | Type              | Description                                                                       |
|---------|-------------------|-----------------------------------------------------------------------------------|
| `url`   | `string` (optional) | Grafana Loki host URL. Falls back to `LOGGER_GRAFANA_URL` env var if omitted.   |
| `level` | `string` (optional) | Override the log level for the Grafana Loki transport specifically.              |

```ts
import { GrafanaLokiConfigSchema } from '@tkottke90/logger';

const grafanaConfig = GrafanaLokiConfigSchema.parse({ url: 'http://localhost:3100' });
```

---

## Usage

### Configure from schema

The recommended way to initialise the logger. Accepts an app name (used as the Grafana job label), validates the config with Zod, sets the log level, and optionally adds the Grafana Loki transport.

```ts
import { configureFromSchema } from '@tkottke90/logger';

configureFromSchema('my-app', {
  level: 'debug',
  grafana: { url: 'http://localhost:3100', level: 'warn' },
});
```

A `ZodError` is thrown if the config is invalid.

### Get the logger

```ts
import { getLogger } from '@tkottke90/logger';

const logger = getLogger();
logger.info('Server started', { port: 3000 });
```

### Create a child logger

Child loggers inherit the parent's transports and append to the name hierarchy:

```ts
import { createChildLogger, getLogger } from '@tkottke90/logger';

const appLogger = createChildLogger('app');          // name: 'app'
const dbLogger = createChildLogger('db', appLogger); // name: 'app.db'

dbLogger.info('Connected to database');
```

### Update log level at runtime

The log level can be changed without restarting the application — existing transports are preserved:

```ts
import { updateLogLevel } from '@tkottke90/logger';

updateLogLevel('debug');
```

### Add file transports

```ts
import { addErrorFileLogger, addJsonLinesFileLogger } from '@tkottke90/logger';

// Human-readable format, captures at 'error' level and above
addErrorFileLogger('/var/log/app/error.log', 'error');

// JSON Lines format for log aggregation
addJsonLinesFileLogger('/var/log/app/app.jsonl');
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
