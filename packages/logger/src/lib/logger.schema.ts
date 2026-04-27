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

/**
 * Winston-compatible levels map derived from `defaultLevels`.
 * Lower number = higher priority, matching Winston's convention.
 */
export const customLevels: Record<string, number> = Object.fromEntries(
  defaultLevels.map((level, index) => [level, index])
);

/**
 * Color map for each custom level, used with `winston.addColors()` so
 * colorized transports render each level distinctly.
 */
export const levelColors: Record<string, string> = {
  foobar: 'magenta',
  error: 'red',
  warn: 'yellow',
  notify: 'cyan',
  info: 'green',
  event: 'blue',
  debug: 'white',
};

export const GrafanaLokiConfigSchema = z.object({
  url: z
    .string()
    .url()
    .optional()
    .describe(
      'Grafana Loki host URL. Falls back to LOGGER_GRAFANA_URL env var if omitted.'
    ),
  level: z.enum(defaultLevels).optional().describe('Override log level for the Grafana transport.'),
});

export const LoggerConfigSchema = z
  .object({
    level: z
      .enum(defaultLevels)
      .default('info')
      .describe('Minimum log level for the logger instance.'),
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
