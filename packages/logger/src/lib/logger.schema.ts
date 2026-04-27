import { z } from 'zod';

export const defaultLevels = [
  'foobar',
  'error',
  'warn',
  'notify',
  'info',
  'event',
  'debug',
] as const;

export const GrafanaLokiConfigSchema = z.object({
  url: z
    .string()
    .url()
    .optional()
    .describe(
      'Grafana Loki host URL. Falls back to LOGGER_GRAFANA_URL env var if omitted.'
    ),
  level: z.string().optional().describe('Override log level for the Grafana transport.'),
});

export const LoggerConfigSchema = z.object({
  level: z
    .enum(defaultLevels)
    .default('info')
    .describe('Minimum log level for the logger instance.'),
  grafana: GrafanaLokiConfigSchema.optional().describe(
    'When provided, a Grafana Loki transport will be added to the logger.'
  ),
});

export type GrafanaLokiConfig = z.infer<typeof GrafanaLokiConfigSchema>;
export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;
