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

// Tracks names assigned by createChildLogger so hierarchical names can be built
// across multiple levels without relying on Winston internals.
const loggerNames = new WeakMap<object, string>();

export function createChildLogger(
  name: string,
  logger: Logger
) {
  const parentName = loggerNames.get(logger);
  const childName = parentName ? `${parentName}.${name}` : name;
  const child = logger.child({ name: childName });
  loggerNames.set(child, childName);
  return child;
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
) {
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

  // Capture Winston's native `.child` before overriding it below, so
  // `createChildLogger` can reach it instead of recursing into the override.
  const nativeChild = LoggerInstance.child.bind(LoggerInstance);

  LoggerInstance.child = (options: object) => {
    const name = (options as Record<string, string>)['name'] || 'logger';
    const parentName = loggerNames.get(LoggerInstance);
    const childName = parentName ? `${parentName}.${name}` : name;
    const child = nativeChild({ name: childName });
    loggerNames.set(child, childName);
    return child;
  }

  return LoggerInstance;
}

