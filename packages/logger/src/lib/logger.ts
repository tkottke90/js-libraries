import { resolve } from 'node:path';
import winston, { Logger, LoggerOptions } from 'winston';
import { customLevels, levelColors } from './constants.js';
import { LoggerConfigSchema } from './logger.schema.js';
import { addConsoleLogger } from './transports/console.js';
import { addGrafanaLokiLogger } from './transports/grafana-loki.js';
import { addErrorFileLogger, addFileLogger } from './transports/json-lines.js';

// Register colors for the custom levels so colorized transports work correctly
winston.addColors(levelColors);

export interface LoggerInstanceConfig {
  level: LoggerOptions['level'];
  levels?: LoggerOptions['levels'];
}

export interface NamespacedLogger extends Logger {
  createChildLogger(name: string, metadata?: Record<string, unknown> | null): NamespacedLogger;
}

// Tracks the dotted "location" assigned to each logger so hierarchical
// locations (e.g. "api.db.query") can be built across multiple levels
// without relying on Winston internals.
const loggerNames = new WeakMap<object, string>();

function attachCreateChildLogger(logger: Logger): NamespacedLogger {
  const namespaced = logger as NamespacedLogger;
  namespaced.createChildLogger = (name, metadata) => createChildLogger(name, namespaced, metadata);
  return namespaced;
}

export function createChildLogger(
  name: string,
  logger: Logger,
  metadata?: Record<string, unknown> | null
): NamespacedLogger {
  const parentName = loggerNames.get(logger);
  const childName = parentName ? `${parentName}.${name}` : name;
  const child = logger.child({ location: childName, ...metadata });
  loggerNames.set(child, childName);
  return attachCreateChildLogger(child);
}

export function updateLogLevel(
  newLevel: string,
  logger: Logger
) {
  logger.level = newLevel;
}

export function configureFromSchema(
  appName: string,
  raw: unknown,
): NamespacedLogger {
  const config = LoggerConfigSchema.parse(raw);

  const resolveFilename = (filename: string) =>
    config.baseUrl ? resolve(config.baseUrl, filename) : filename;

  const transports: winston.transport[] = [];

  if (config.grafana) {
    transports.push(addGrafanaLokiLogger(appName, config.grafana));
  }

  if (config.console?.enabled) {
    transports.push(addConsoleLogger(config.console));
  }

  if (config.file?.log?.enabled && config.file.log.filename) {
    transports.push(addFileLogger(resolveFilename(config.file.log.filename), { level: config.file.log.level }));
  }

  if (config.file?.error?.enabled && config.file.error.filename) {
    transports.push(addErrorFileLogger(resolveFilename(config.file.error.filename), { level: config.file.error.level }));
  }

  const LoggerInstance = winston.createLogger({
    levels: customLevels,
    level: config.level,
    transports,
  });

  // Route the root's own `location` through the same `.child()` mechanism as
  // every descendant, rather than Winston's `defaultMeta` option. Winston
  // merges `this.defaultMeta` into every log's info object *before* a
  // `.child()`-level default is applied (see Logger.prototype.log), so a
  // `defaultMeta.location` set directly on the root would always win over a
  // more specific child's location. Going through `.child()` uniformly keeps
  // "deepest child wins" semantics intact at every level.
  return createChildLogger(appName, LoggerInstance);
}
