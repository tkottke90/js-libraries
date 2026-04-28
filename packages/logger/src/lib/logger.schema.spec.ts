import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultLevels } from './constants.js';
import { LoggerConfigSchema } from './logger.schema.js';
import { GrafanaLokiConfigSchema } from './transports/grafana-loki.js';

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

describe('LoggerConfigSchema — console config', () => {
  it('should be absent when not provided', () => {
    const result = LoggerConfigSchema.parse({});
    expect(result.console).toBeUndefined();
  });

  it('should default enabled to true when console object is present', () => {
    const result = LoggerConfigSchema.parse({ console: {} });
    expect(result.console?.enabled).toBe(true);
  });

  it('should accept explicit enabled: false', () => {
    const result = LoggerConfigSchema.parse({ console: { enabled: false } });
    expect(result.console?.enabled).toBe(false);
  });

  it('should accept an optional level override', () => {
    const result = LoggerConfigSchema.parse({ console: { enabled: true, level: 'debug' } });
    expect(result.console?.level).toBe('debug');
  });

  it('should throw for an invalid console level', () => {
    expect(() => LoggerConfigSchema.parse({ console: { level: 'verbose' } })).toThrow();
  });
});

describe('LoggerConfigSchema — file.log config', () => {
  it('should be absent when file is not provided', () => {
    const result = LoggerConfigSchema.parse({});
    expect(result.file?.log).toBeUndefined();
  });

  it('should accept a valid file.log config', () => {
    const result = LoggerConfigSchema.parse({ file: { log: { filename: '/tmp/app.log' } } });
    expect(result.file?.log?.filename).toBe('/tmp/app.log');
  });

  it('should default enabled to true', () => {
    const result = LoggerConfigSchema.parse({ file: { log: { filename: '/tmp/app.log' } } });
    expect(result.file?.log?.enabled).toBe(true);
  });

  it('should accept enabled: false', () => {
    const result = LoggerConfigSchema.parse({
      file: { log: { enabled: false, filename: '/tmp/app.log' } },
    });
    expect(result.file?.log?.enabled).toBe(false);
  });

  it('should throw when filename is missing', () => {
    expect(() => LoggerConfigSchema.parse({ file: { log: { enabled: true } } })).toThrow();
  });

  it('should accept an optional level override', () => {
    const result = LoggerConfigSchema.parse({
      file: { log: { filename: '/tmp/app.log', level: 'warn' } },
    });
    expect(result.file?.log?.level).toBe('warn');
  });

  it('should throw for an invalid level override', () => {
    expect(() =>
      LoggerConfigSchema.parse({ file: { log: { filename: '/tmp/app.log', level: 'verbose' } } })
    ).toThrow();
  });
});

describe('LoggerConfigSchema — file.error config', () => {
  it('should be absent when file is not provided', () => {
    const result = LoggerConfigSchema.parse({});
    expect(result.file?.error).toBeUndefined();
  });

  it('should accept a valid file.error config', () => {
    const result = LoggerConfigSchema.parse({ file: { error: { filename: '/tmp/error.log' } } });
    expect(result.file?.error?.filename).toBe('/tmp/error.log');
  });

  it('should default enabled to true', () => {
    const result = LoggerConfigSchema.parse({ file: { error: { filename: '/tmp/error.log' } } });
    expect(result.file?.error?.enabled).toBe(true);
  });

  it('should accept enabled: false', () => {
    const result = LoggerConfigSchema.parse({
      file: { error: { enabled: false, filename: '/tmp/error.log' } },
    });
    expect(result.file?.error?.enabled).toBe(false);
  });

  it('should throw when filename is missing', () => {
    expect(() => LoggerConfigSchema.parse({ file: { error: { enabled: true } } })).toThrow();
  });

  it('should accept an optional level override', () => {
    const result = LoggerConfigSchema.parse({
      file: { error: { filename: '/tmp/error.log', level: 'error' } },
    });
    expect(result.file?.error?.level).toBe('error');
  });

  it('should throw for an invalid level override', () => {
    expect(() =>
      LoggerConfigSchema.parse({
        file: { error: { filename: '/tmp/error.log', level: 'verbose' } },
      })
    ).toThrow();
  });
});

describe('LoggerConfigSchema — file key independence', () => {
  it('should allow file.log without file.error', () => {
    expect(() =>
      LoggerConfigSchema.parse({ file: { log: { filename: '/tmp/app.log' } } })
    ).not.toThrow();
  });

  it('should allow file.error without file.log', () => {
    expect(() =>
      LoggerConfigSchema.parse({ file: { error: { filename: '/tmp/error.log' } } })
    ).not.toThrow();
  });

  it('should allow both file.log and file.error together', () => {
    expect(() =>
      LoggerConfigSchema.parse({
        file: {
          log: { filename: '/tmp/app.log' },
          error: { filename: '/tmp/error.log' },
        },
      })
    ).not.toThrow();
  });

  it('should be absent entirely when file is not provided', () => {
    const result = LoggerConfigSchema.parse({});
    expect(result.file).toBeUndefined();
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

describe('LoggerConfigSchema — baseUrl config', () => {
  it('should be absent when baseUrl is not provided', () => {
    const result = LoggerConfigSchema.parse({});
    expect(result.baseUrl).toBeUndefined();
  });

  it('should accept a valid absolute baseUrl string', () => {
    const result = LoggerConfigSchema.parse({ baseUrl: '/var/log' });
    expect(result.baseUrl).toBe('/var/log');
  });

  it('should accept a relative path as baseUrl', () => {
    expect(() => LoggerConfigSchema.parse({ baseUrl: './logs' })).not.toThrow();
  });

  it('should parse baseUrl alongside file.log config', () => {
    const result = LoggerConfigSchema.parse({
      baseUrl: '/var/log',
      file: { log: { filename: 'app.log' } },
    });
    expect(result.baseUrl).toBe('/var/log');
    expect(result.file?.log?.filename).toBe('app.log');
  });

  it('should parse baseUrl alongside file.error config', () => {
    const result = LoggerConfigSchema.parse({
      baseUrl: '/var/log',
      file: { error: { filename: 'error.log' } },
    });
    expect(result.baseUrl).toBe('/var/log');
    expect(result.file?.error?.filename).toBe('error.log');
  });

  it('should parse baseUrl alongside both file.log and file.error', () => {
    const result = LoggerConfigSchema.parse({
      baseUrl: '/var/log',
      file: {
        log: { filename: 'app.log' },
        error: { filename: 'error.log' },
      },
    });
    expect(result.baseUrl).toBe('/var/log');
    expect(result.file?.log?.filename).toBe('app.log');
    expect(result.file?.error?.filename).toBe('error.log');
  });
});
