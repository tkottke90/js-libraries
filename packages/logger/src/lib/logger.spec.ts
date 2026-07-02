/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import winston, { Logger } from 'winston';
import LokiTransport from 'winston-loki';
import Transport from 'winston-transport';
import { ZodError } from 'zod';
import { customLevels } from './constants.js';
import { InvalidGrafanaConfig } from './errors.js';
import { configureFromSchema, createChildLogger, updateLogLevel } from './logger.js';
import { addGrafanaLokiLogger } from './transports/grafana-loki.js';

// ---------------------------------------------------------------------------
// Helper: capture the raw `info` object Winston hands to a transport.
//
// Winston's `.child(meta)` does NOT set a `defaultMeta` property on the
// returned logger — it wraps `.write()` to merge `meta` into the info object
// at log time (see Logger.prototype.child). So the only reliable way to
// observe what a child logger's location/metadata actually resolve to is to
// emit a real log message and inspect what a transport receives.
// ---------------------------------------------------------------------------
class CapturingTransport extends Transport {
  captured: any[] = [];
  override log(info: any, callback: () => void) {
    this.captured.push(info);
    callback();
  }
}

function createCapturingLogger() {
  const capture = new CapturingTransport();
  const logger = winston.createLogger({
    levels: customLevels,
    level: 'debug',
    transports: [capture],
  });
  return { logger, capture };
}

describe('Logger Module', () => {
  let testLogger: Logger;

  beforeEach(() => {
    testLogger = winston.createLogger({
      levels: customLevels,
      level: 'info',
      format: winston.format.json(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createChildLogger', () => {
    it('should return a valid logger instance with logging methods', () => {
      const childLogger = createChildLogger('test', testLogger);
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.error).toBe('function');
      expect(typeof childLogger.debug).toBe('function');
    });

    it('should call logger.child() with the provided name as location', () => {
      const spy = vi.spyOn(testLogger, 'child');
      createChildLogger('myservice', testLogger);
      expect(spy).toHaveBeenCalledWith({ location: 'myservice' });
    });

    it('should merge additional metadata alongside location', () => {
      const spy = vi.spyOn(testLogger, 'child');
      createChildLogger('myservice', testLogger, { user: 'a@b.com', reqId: '123' });
      expect(spy).toHaveBeenCalledWith({ location: 'myservice', user: 'a@b.com', reqId: '123' });
    });

    it('should ignore null metadata', () => {
      const spy = vi.spyOn(testLogger, 'child');
      createChildLogger('myservice', testLogger, null);
      expect(spy).toHaveBeenCalledWith({ location: 'myservice' });
    });

    it('should build exact hierarchical location "parent.child" when parent has a location', () => {
      const parentWithName = createChildLogger('parent', testLogger);
      const spy = vi.spyOn(parentWithName, 'child');
      createChildLogger('child', parentWithName);
      expect(spy).toHaveBeenCalledWith({ location: 'parent.child' });
    });

    it('should build a three-level hierarchical location', () => {
      const level1 = createChildLogger('app', testLogger);
      const level2 = createChildLogger('database', level1);
      const spy = vi.spyOn(level2, 'child');
      createChildLogger('query', level2);
      expect(spy).toHaveBeenCalledWith({ location: 'app.database.query' });
    });

    it('should work with any provided logger instance', () => {
      const customLogger = winston.createLogger();
      const spy = vi.spyOn(customLogger, 'child');
      createChildLogger('custom', customLogger);
      expect(spy).toHaveBeenCalledWith({ location: 'custom' });
    });

    it('should attach a working createChildLogger() instance method to the returned logger', () => {
      const { logger, capture } = createCapturingLogger();
      const parent = createChildLogger('parent', logger);
      const grandchild = parent.createChildLogger('child');
      grandchild.info('hello');
      expect(capture.captured[0].location).toBe('parent.child');
    });

    it('should merge metadata passed through the instance method', () => {
      const { logger, capture } = createCapturingLogger();
      const parent = createChildLogger('parent', logger);
      const grandchild = parent.createChildLogger('child', { reqId: 'abc' });
      grandchild.info('hello');
      expect(capture.captured[0].location).toBe('parent.child');
      expect(capture.captured[0].reqId).toBe('abc');
    });
  });

  describe('updateLogLevel', () => {
    it('should update log level on the provided logger', () => {
      updateLogLevel('debug', testLogger);
      expect(testLogger.level).toBe('debug');
    });

    it('should update log level to error', () => {
      updateLogLevel('error', testLogger);
      expect(testLogger.level).toBe('error');
    });

    it('should update log level to warn', () => {
      updateLogLevel('warn', testLogger);
      expect(testLogger.level).toBe('warn');
    });

    it('should overwrite a previously-set level', () => {
      updateLogLevel('debug', testLogger);
      updateLogLevel('error', testLogger);
      expect(testLogger.level).toBe('error');
    });
  });

  describe('addGrafanaLokiLogger', () => {
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

    it('should return a LokiTransport when url is provided in options', () => {
      const transport = addGrafanaLokiLogger('test-app', { url: 'http://localhost:3100' });
      expect(transport).toBeInstanceOf(LokiTransport);
    });

    it('should apply the job label from appName', () => {
      const transport = addGrafanaLokiLogger('my-app', { url: 'http://localhost:3100' }) as any;
      expect(transport.labels).toEqual({ job: 'my-app' });
    });

    it('should apply a custom level when provided', () => {
      const transport = addGrafanaLokiLogger('test-app', { url: 'http://localhost:3100', level: 'debug' });
      expect(transport.level).toBe('debug');
    });

    it('should have a format configured', () => {
      const transport = addGrafanaLokiLogger('test-app', { url: 'http://localhost:3100' });
      expect(transport.format).toBeDefined();
    });

    it('should throw InvalidGrafanaConfig when url is not provided', () => {
      expect(() => addGrafanaLokiLogger('test-app', {})).toThrow(InvalidGrafanaConfig);
    });

    it('should throw InvalidGrafanaConfig when url is empty string', () => {
      expect(() => addGrafanaLokiLogger('test-app', { url: '' })).toThrow(InvalidGrafanaConfig);
    });

    it('should use LOGGER_GRAFANA_URL env var when options.url is not provided', () => {
      process.env.LOGGER_GRAFANA_URL = 'http://env-grafana:3100';
      expect(() => addGrafanaLokiLogger('test-app', {})).not.toThrow();
    });

    it('should prefer options.url over LOGGER_GRAFANA_URL env var', () => {
      process.env.LOGGER_GRAFANA_URL = 'http://env-grafana:3100';
      const transport = addGrafanaLokiLogger('test-app', { url: 'http://options-grafana:3100' });
      expect(transport).toBeInstanceOf(LokiTransport);
    });
  });

  describe('configureFromSchema', () => {
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

    it('should return a logger with the level from config', () => {
      const result = configureFromSchema('test-app', { level: 'debug' });
      expect(result.level).toBe('debug');
    });

    it('should return a logger with default level "info" when level is omitted', () => {
      const result = configureFromSchema('test-app', {});
      expect(result.level).toBe('info');
    });

    it('should throw ZodError for an invalid level value', () => {
      expect(() => configureFromSchema('test-app', { level: 'invalid-level' })).toThrow(ZodError);
    });

    it('should throw ZodError when grafana.url is not a valid URL', () => {
      expect(() =>
        configureFromSchema('test-app', { level: 'info', grafana: { url: 'not-a-url' } })
      ).toThrow(ZodError);
    });

    it('should throw ZodError when grafana is provided without a URL and no env var is set', () => {
      expect(() => configureFromSchema('test-app', { grafana: {} })).toThrow(ZodError);
    });

    it('should not throw when grafana is provided without url but LOGGER_GRAFANA_URL env var is set', () => {
      process.env.LOGGER_GRAFANA_URL = 'http://localhost:3100';
      expect(() => configureFromSchema('test-app', { grafana: {} })).not.toThrow();
    });

    it('should return a logger instance with info/error/warn/debug methods', () => {
      const result = configureFromSchema('test-app', {});
      expect(typeof result.info).toBe('function');
      expect(typeof result.error).toBe('function');
      expect(typeof result.warn).toBe('function');
      expect(typeof result.debug).toBe('function');
    });

    describe('grafana transport', () => {
      it('should add a Loki transport when grafana config is present', () => {
        const result = configureFromSchema('test-app', {
          level: 'info',
          grafana: { url: 'http://localhost:3100' },
        });
        expect(result.transports.some((t) => t instanceof LokiTransport)).toBe(true);
      });

      it('should not add a Loki transport when grafana config is absent', () => {
        const result = configureFromSchema('test-app', { level: 'info' });
        expect(result.transports.some((t) => t instanceof LokiTransport)).toBe(false);
      });

      it('should pass appName as the Grafana job label', () => {
        const result = configureFromSchema('my-service', {
          level: 'info',
          grafana: { url: 'http://localhost:3100' },
        });
        const loki = result.transports.find((t) => t instanceof LokiTransport) as any;
        expect(loki.labels).toEqual({ job: 'my-service' });
      });
    });

    describe('console transport', () => {
      it('should add a Console transport when console.enabled is true', () => {
        const result = configureFromSchema('test-app', { console: { enabled: true } });
        expect(result.transports.some((t) => t instanceof winston.transports.Console)).toBe(true);
      });

      it('should not add a Console transport when console.enabled is false', () => {
        const result = configureFromSchema('test-app', { console: { enabled: false } });
        expect(result.transports.some((t) => t instanceof winston.transports.Console)).toBe(false);
      });

      it('should not add a Console transport when console config is absent', () => {
        const result = configureFromSchema('test-app', {});
        expect(result.transports.some((t) => t instanceof winston.transports.Console)).toBe(false);
      });

      it('should forward console.level to the Console transport', () => {
        const result = configureFromSchema('test-app', { console: { enabled: true, level: 'warn' } });
        const consoleTrans = result.transports.find((t) => t instanceof winston.transports.Console);
        expect(consoleTrans?.level).toBe('warn');
      });
    });

    describe('file.log transport', () => {
      it('should add a File transport when file.log is enabled with a filename', () => {
        const result = configureFromSchema('test-app', {
          file: { log: { enabled: true, filename: '/tmp/app.log' } },
        });
        const fileTransports = result.transports.filter((t) => t instanceof winston.transports.File);
        expect(fileTransports).toHaveLength(1);
      });

      it('should not add a File transport when file.log.enabled is false', () => {
        const result = configureFromSchema('test-app', {
          file: { log: { enabled: false, filename: '/tmp/app.log' } },
        });
        expect(result.transports.some((t) => t instanceof winston.transports.File)).toBe(false);
      });

      it('should not add a File transport when file.log is absent', () => {
        const result = configureFromSchema('test-app', {});
        expect(result.transports.some((t) => t instanceof winston.transports.File)).toBe(false);
      });

      it('should forward file.log.filename to the File transport', () => {
        const result = configureFromSchema('test-app', {
          file: { log: { enabled: true, filename: '/tmp/app.log' } },
        });
        const fileTrans = result.transports.find((t) => t instanceof winston.transports.File) as any;
        expect(fileTrans.filename).toContain('app.log');
      });

      it('should resolve file.log.filename relative to baseUrl when baseUrl is provided', () => {
        const result = configureFromSchema('test-app', {
          file: { log: { enabled: true, filename: 'resolved.log' } },
          baseUrl: '/tmp',
        });
        const fileTrans = result.transports.find((t) => t instanceof winston.transports.File) as any;
        expect(fileTrans.dirname).toBe('/tmp');
        expect(fileTrans.filename).toBe('resolved.log');
      });

      it('should not modify file.log.filename when baseUrl is absent', () => {
        const result = configureFromSchema('test-app', {
          file: { log: { enabled: true, filename: '/tmp/app.log' } },
        });
        const fileTrans = result.transports.find((t) => t instanceof winston.transports.File) as any;
        expect(fileTrans.dirname).toBe('/tmp');
        expect(fileTrans.filename).toBe('app.log');
      });

      it('should pass absolute file.log.filename unchanged when baseUrl is set', () => {
        const result = configureFromSchema('test-app', {
          file: { log: { enabled: true, filename: '/tmp/app.log' } },
          baseUrl: '/tmp/sub',
        });
        const fileTrans = result.transports.find((t) => t instanceof winston.transports.File) as any;
        expect(fileTrans.dirname).toBe('/tmp');
        expect(fileTrans.filename).toBe('app.log');
      });
    });

    describe('file.error transport', () => {
      it('should add a File transport with level "error" when file.error is enabled', () => {
        const result = configureFromSchema('test-app', {
          file: { error: { enabled: true, filename: '/tmp/error.log' } },
        });
        const errorTransport = result.transports.find(
          (t) => t instanceof winston.transports.File && t.level === 'error'
        );
        expect(errorTransport).toBeDefined();
      });

      it('should not add a File transport when file.error.enabled is false', () => {
        const result = configureFromSchema('test-app', {
          file: { error: { enabled: false, filename: '/tmp/error.log' } },
        });
        expect(result.transports.some((t) => t instanceof winston.transports.File)).toBe(false);
      });

      it('should not add a File transport when file.error is absent', () => {
        const result = configureFromSchema('test-app', {});
        expect(result.transports.some((t) => t instanceof winston.transports.File)).toBe(false);
      });

      it('should forward file.error.filename to the error File transport', () => {
        const result = configureFromSchema('test-app', {
          file: { error: { enabled: true, filename: '/tmp/error.log' } },
        });
        const fileTrans = result.transports.find((t) => t instanceof winston.transports.File) as any;
        expect(fileTrans.filename).toContain('error.log');
      });

      it('should resolve file.error.filename relative to baseUrl when baseUrl is provided', () => {
        const result = configureFromSchema('test-app', {
          file: { error: { enabled: true, filename: 'resolved-error.log' } },
          baseUrl: '/tmp',
        });
        const fileTrans = result.transports.find((t) => t instanceof winston.transports.File) as any;
        expect(fileTrans.dirname).toBe('/tmp');
        expect(fileTrans.filename).toBe('resolved-error.log');
      });

      it('should not modify file.error.filename when baseUrl is absent', () => {
        const result = configureFromSchema('test-app', {
          file: { error: { enabled: true, filename: '/tmp/error.log' } },
        });
        const fileTrans = result.transports.find((t) => t instanceof winston.transports.File) as any;
        expect(fileTrans.dirname).toBe('/tmp');
        expect(fileTrans.filename).toBe('error.log');
      });

      it('should pass absolute file.error.filename unchanged when baseUrl is set', () => {
        const result = configureFromSchema('test-app', {
          file: { error: { enabled: true, filename: '/tmp/error.log' } },
          baseUrl: '/tmp/sub',
        });
        const fileTrans = result.transports.find((t) => t instanceof winston.transports.File) as any;
        expect(fileTrans.dirname).toBe('/tmp');
        expect(fileTrans.filename).toBe('error.log');
      });

      it('should add two File transports when both file.log and file.error are enabled', () => {
        const result = configureFromSchema('test-app', {
          file: {
            log: { enabled: true, filename: '/tmp/app.log' },
            error: { enabled: true, filename: '/tmp/error.log' },
          },
        });
        const fileTransports = result.transports.filter((t) => t instanceof winston.transports.File);
        expect(fileTransports).toHaveLength(2);
      });
    });

    describe('baseUrl with both file transports', () => {
      it('should resolve both file.log and file.error filenames when baseUrl is provided', () => {
        const result = configureFromSchema('test-app', {
          baseUrl: '/tmp',
          file: {
            log: { enabled: true, filename: 'app.log' },
            error: { enabled: true, filename: 'error.log' },
          },
        });
        const fileTransports = result.transports.filter((t) => t instanceof winston.transports.File) as any[];
        expect(fileTransports).toHaveLength(2);
        for (const t of fileTransports) {
          expect(t.dirname).toBe('/tmp');
        }
      });
    });

    it('should register customLevels on the returned logger', () => {
      const result = configureFromSchema('test-app', {});
      expect(result.levels).toEqual(customLevels);
    });

    describe('child logger hierarchy', () => {
      it('should seed the root logger location with appName', () => {
        const spy = vi.spyOn(winston.Logger.prototype, 'child');
        configureFromSchema('my-app', {});
        expect(spy).toHaveBeenCalledWith({ location: 'my-app' });
      });

      it('should not throw when calling createChildLogger() on the returned logger', () => {
        const result = configureFromSchema('test-app', { console: { enabled: true } });
        expect(() => createChildLogger('child', result)).not.toThrow();
      });

      it('should not throw when calling the createChildLogger() instance method', () => {
        const result = configureFromSchema('test-app', { console: { enabled: true } });
        expect(() => result.createChildLogger('child')).not.toThrow();
      });

      it('should build a hierarchical location via createChildLogger()', () => {
        const result = configureFromSchema('app', {});
        const spy = vi.spyOn(result, 'child');
        createChildLogger('db', result);
        expect(spy).toHaveBeenCalledWith({ location: 'app.db' });
      });

      it('should build a hierarchical location via the instance method', () => {
        const result = configureFromSchema('app', {});
        const spy = vi.spyOn(result, 'child');
        result.createChildLogger('db');
        expect(spy).toHaveBeenCalledWith({ location: 'app.db' });
      });

      it('should build a multi-level hierarchical location', () => {
        const result = configureFromSchema('app', {});
        const dbLogger = result.createChildLogger('db');
        const spy = vi.spyOn(dbLogger, 'child');
        dbLogger.createChildLogger('query');
        expect(spy).toHaveBeenCalledWith({ location: 'app.db.query' });
      });

      it('should merge metadata into the child() call alongside the location', () => {
        const result = configureFromSchema('api', {});
        const spy = vi.spyOn(result, 'child');
        result.createChildLogger('get-posts', { user: 'a@b.com', reqId: '123' });
        expect(spy).toHaveBeenCalledWith({ location: 'api.get-posts', user: 'a@b.com', reqId: '123' });
      });

      it('should allow createChildLogger with null metadata', () => {
        const result = configureFromSchema('app', {});
        expect(() => result.createChildLogger('child', null)).not.toThrow();
      });

      it('should actually emit the composed location and metadata on log output', () => {
        // End-to-end check (independent of the .child() call-arg spies above):
        // build a hierarchy purely through the public API and confirm what a
        // transport actually receives, exercising the real Winston merge chain.
        const { logger, capture } = createCapturingLogger();
        const root = createChildLogger('api', logger);
        const reqLogger = root.createChildLogger('get-posts', { reqId: '123', user: 'a@b.com' });
        const dbLogger = reqLogger.createChildLogger('db-query');
        dbLogger.debug('query executed');

        const [entry] = capture.captured;
        expect(entry.location).toBe('api.get-posts.db-query');
        expect(entry.reqId).toBe('123');
        expect(entry.user).toBe('a@b.com');
      });
    });
  });
});

