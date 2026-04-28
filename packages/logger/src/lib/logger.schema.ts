import { z } from 'zod';
import { defaultLevels } from './constants.js';
import { ConsoleConfigSchema } from './transports/console.js';
import { GrafanaLokiConfigSchema } from './transports/grafana-loki.js';
import { FileConfigSchema } from './transports/json-lines.js';

export const LoggerConfigSchema = z
  .object({
    level: z
      .enum(defaultLevels)
      .default('info')
      .describe('Minimum log level for the logger instance.'),
    console: ConsoleConfigSchema.optional().describe(
      'When provided, configures the console transport.'
    ),
    file: z
      .object({
        log: FileConfigSchema.optional().describe(
          'When provided, a file transport will be added for all log levels.'
        ),
        error: FileConfigSchema.optional().describe(
          'When provided, a file transport will be added for error-level logs only.'
        ),
      })
      .optional()
      .describe('File transport configuration.'),
    grafana: GrafanaLokiConfigSchema.optional().describe(
      'When provided, a Grafana Loki transport will be added to the logger.'
    ),
  })
  .superRefine((data, ctx) => {
    if (data.grafana !== undefined && !data.grafana.url && !process.env.LOGGER_GRAFANA_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Grafana URL must be provided either in grafana.url or the LOGGER_GRAFANA_URL environment variable',
        path: ['grafana', 'url'],
      });
    }
  });

export type GrafanaLokiConfig = z.infer<typeof GrafanaLokiConfigSchema>;
export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;
