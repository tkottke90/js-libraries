import winston from "winston";
import z from "zod";
import { defaultLevels } from "../constants.js";

export const JSON_LINES_FORMAT = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
)

export const FileConfigSchema = z.object({
  enabled: z.boolean().default(true).describe('Enable or disable file logging.'),
  level: z.enum(defaultLevels).optional().describe('Override log level for the file transport.'),
  filename: z.string().describe('Filename or path of the log file. When a baseUrl is configured on the logger, this value is resolved relative to it.'),
});

export function addFileLogger(
  filename: string,
  options?: winston.transports.FileTransportOptions,
) {
  return new winston.transports.File({
    filename,
    format: JSON_LINES_FORMAT,
    ...options
  });
}

export function addErrorFileLogger(
  filename: string,
  options?: winston.transports.FileTransportOptions,
) {
  return new winston.transports.File({
      filename,
      format: JSON_LINES_FORMAT,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
      ...options,
      level: 'error',
    })
}