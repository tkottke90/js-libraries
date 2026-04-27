import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GrafanaLokiConfigSchema, LoggerConfigSchema, defaultLevels } from './logger.schema.js';

describe('LoggerConfigSchema', () => {
  let originalGrafanaUrl: string | undefined;

  beforeEach(() => {
    originalGrafanaUrl = process.env.LOGGER_GRAFANA_URL;
    delete process.env.LOGGER_GRAFANA_URL;
  });

  afterEach(() => {
    if (originalGrafanaUrl !== undefined) {
      process.env.LOGGER_GRAFANA_URL = originalGrafanaUrl;
    } else {
      delete process.env.LOGGER_GRAFANA_URL;
    }
  });

  it('should parse a minimal valid config', () => {
    const result = LoggerConfigSchema.parse({ level: 'info' });
    expect(result.level).toBe('info');
  });

  it('should apply default level "info" when level is omitted', () => {
    const result = LoggerConfigSchema.parse({});
    expect(result.level).toBe('info');
  });

  it('should accept all valid level values', () => {
    for (const level of defaultLevels) {
      expect(() => LoggerConfigSchema.parse({ level })).not.toThrow();
    }
  });

  it('should throw for an unknown level string', () => {
    expect(() => LoggerConfigSchema.parse({ level: 'verbose' })).toThrow();
  });

  it('should parse config with a valid grafana sub-object', () => {
    const result = LoggerConfigSchema.parse({
      level: 'info',
      grafana: { url: 'http://localhost:3100' },
    });
    expect(result.grafana?.url).toBe('http://localhost:3100');
  });

  it('should parse config with grafana absent', () => {
    const result = LoggerConfigSchema.parse({ level: 'debug' });
    expect(result.grafana).toBeUndefined();
  });

  it('should throw when grafana.url is not a valid URL', () => {
    expect(() =>
      LoggerConfigSchema.parse({ level: 'info', grafana: { url: 'not-a-url' } })
    ).toThrow();
  });

  it('should throw when grafana is provided without url and LOGGER_GRAFANA_URL is not set', () => {
    expect(() => LoggerConfigSchema.parse({ grafana: {} })).toThrow();
  });

  it('should pass when grafana is provided without url but LOGGER_GRAFANA_URL env var is set', () => {
    process.env.LOGGER_GRAFANA_URL = 'http://localhost:3100';
    expect(() => LoggerConfigSchema.parse({ grafana: {} })).not.toThrow();
  });
});

describe('GrafanaLokiConfigSchema', () => {
  it('should parse a config with a valid URL', () => {
    const result = GrafanaLokiConfigSchema.parse({ url: 'http://grafana.example.com:3100' });
    expect(result.url).toBe('http://grafana.example.com:3100');
  });

  it('should parse a config with both url and level', () => {
    const result = GrafanaLokiConfigSchema.parse({
      url: 'http://localhost:3100',
      level: 'warn',
    });
    expect(result.url).toBe('http://localhost:3100');
    expect(result.level).toBe('warn');
  });

  it('should parse an empty object since all fields are optional', () => {
    const result = GrafanaLokiConfigSchema.parse({});
    expect(result.url).toBeUndefined();
    expect(result.level).toBeUndefined();
  });

  it('should throw for an invalid URL', () => {
    expect(() => GrafanaLokiConfigSchema.parse({ url: 'not-a-url' })).toThrow();
  });

  it('should throw for an invalid level string', () => {
    expect(() =>
      GrafanaLokiConfigSchema.parse({ url: 'http://localhost:3100', level: 'verbose' })
    ).toThrow();
  });
});
