import winston, { Logger, LoggerOptions, format, transports } from 'winston';
import LokiTransport from 'winston-loki';
const { combine, timestamp, json, errors, simple } = format;

const LoggerInstance = winston.createLogger();

export interface LoggerInstanceConfig {
  level: LoggerOptions['level'],
  levels: LoggerOptions['levels'],
}

export const defaultLevels = [
  'foobar',
  'error',
  'warn',
  'notify',
  'info',
  'event',
  'debug'
] as const

export function addErrorFileLogger(filename: string, level?: string, logger: Logger = LoggerInstance) {
  logger.add(
    new transports.File({ filename, format: combine(simple(), errors(), timestamp()), level: level ?? logger.level })
  );
}

export function addGrafanaLokiLogger(grafanaUrl: string, appName: string, level?: string, logger: Logger = LoggerInstance) {
  logger.add(
    new LokiTransport({
      host: grafanaUrl,
      json: true,
      labels: { job: appName },
      format: combine(timestamp(), json()),
      level: level ?? logger.level
    })
  );
}

export function addJsonLinesFileLogger(filename: string, level?: string, logger: Logger = LoggerInstance) {
  logger.add(
    new transports.File({ filename, format: combine(timestamp(), json()), level: level ?? logger.level })
  )
}

export function createChildLogger(name: string, logger: Logger = LoggerInstance) {
  // Get the parent logger's name from its metadata if it exists
  const parentName = logger.data?.name;

  // Append the new name to the parent name if parent name exists
  const childName = parentName ? `${parentName}.${name}` : name;

  return logger.child({ name: childName });
}

export function configure(config: LoggerInstanceConfig) {
  LoggerInstance.configure({
    ...config
  });
}

export function getLogger() {
  return LoggerInstance;
}

export function updateLogLevel(newLevel: string, logger: Logger = LoggerInstance) {
  logger.configure({
    level: newLevel
  });
}