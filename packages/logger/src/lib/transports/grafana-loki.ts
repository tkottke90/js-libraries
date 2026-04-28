import LokiTransport from "winston-loki";
import z from "zod";
import { defaultLevels } from '../constants.js';
import { InvalidGrafanaConfig } from "../errors.js";
import { JSON_LINES_FORMAT } from "./json-lines.js";

interface GrafanaLokiLoggerOptions {
  url?: string;
  level?: string;
}

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

export function addGrafanaLokiLogger(
  appName: string,
  options?: GrafanaLokiLoggerOptions
) {
  const url = process.env.LOGGER_GRAFANA_URL ?? options?.url ?? '';

  if (!url) {
    throw new InvalidGrafanaConfig(
      'Missing URL - Please provide the url in the environment (as LOGGER_GRAFANA_URL) or in the options.url property'
    );
  }

  return new LokiTransport({
    host: url,
    json: true,
    labels: { job: appName },
    format: JSON_LINES_FORMAT,
    ...options
  })
}