import winston from 'winston';
import { ConsoleTransportOptions } from 'winston/lib/winston/transports/index.js';
import z from 'zod';
import { defaultLevels } from '../constants.js';

export const ConsoleConfigSchema = z.object({
  enabled: z.boolean().default(true).describe('Enable or disable console logging.'),
  level: z.enum(defaultLevels).optional().describe('Override log level for the Grafana transport.'),
});

export const CONSOLE_FORMAT = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, location, ...meta }) => {
    // Create a string representation of the meta information if it exists
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    
    let localStr = `api`;

    if (location) {
      localStr += `.${location}`;
    }

    // Format the log message with timestamp, level, location, message, and meta information
    return `${timestamp} [${level.toUpperCase()}] [${localStr}] ${message} ${metaString}`;
  })
);

export function addConsoleLogger(options?: ConsoleTransportOptions) {
  return new winston.transports.Console({
    format: CONSOLE_FORMAT,
    level: options?.level ?? 'info',
    ...options,
  });
}