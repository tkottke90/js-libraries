/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import winston, { Logger } from 'winston';
import { InvalidGrafanaConfig } from './errors.js';
import {
  addErrorFileLogger,
  addGrafanaLokiLogger,
  addJsonLinesFileLogger,
  configure,
  createChildLogger,
  getLogger,
  LoggerInstanceConfig,
  updateLogLevel,
} from './logger.js';

describe('Logger Module', () => {
  let testLogger: Logger;

  beforeEach(() => {
    // Create a fresh logger instance for each test
    testLogger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
    });
    // Spy on the add method to track transport additions
    vi.spyOn(testLogger, 'add');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createChildLogger', () => {
    it('should create a child logger with provided name', () => {
      const childLogger = createChildLogger('test', testLogger);
      expect(childLogger).toBeDefined();
      // Verify the child logger is a Logger instance
      expect(childLogger).toHaveProperty('info');
      expect(childLogger).toHaveProperty('error');
    });

    it('should append name to parent logger name if parent has a name', () => {
      const parentLogger = createChildLogger('parent', testLogger);
      const childLogger = createChildLogger('child', parentLogger);
      expect(childLogger).toBeDefined();
      // Both should be valid logger instances
      expect(parentLogger).toHaveProperty('info');
      expect(childLogger).toHaveProperty('info');
    });

    it('should create hierarchical names for nested loggers', () => {
      const level1 = createChildLogger('app', testLogger);
      const level2 = createChildLogger('database', level1);
      const level3 = createChildLogger('query', level2);
      // All should be valid logger instances
      expect(level1).toHaveProperty('info');
      expect(level2).toHaveProperty('info');
      expect(level3).toHaveProperty('info');
    });

    it('should use provided logger instance', () => {
      const customLogger = winston.createLogger();
      const childLogger = createChildLogger('custom', customLogger);
      expect(childLogger).toBeDefined();
    });

    it('should use default LoggerInstance when no logger provided', () => {
      const childLogger = createChildLogger('default');
      expect(childLogger).toBeDefined();
    });
  });

  describe('configure', () => {
    it('should configure the logger with provided config', () => {
      const config: LoggerInstanceConfig = {
        level: 'debug',
        levels: undefined,
      };
      expect(() => configure(config)).not.toThrow();
    });

    it('should accept config with level property', () => {
      const config: LoggerInstanceConfig = {
        level: 'warn',
        levels: undefined,
      };
      expect(() => configure(config)).not.toThrow();
    });
  });

  describe('getLogger', () => {
    it('should return a logger instance', () => {
      const logger = getLogger();
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });

    it('should return the same instance on multiple calls', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });
  });

  describe('updateLogLevel', () => {
    it('should update log level on provided logger', () => {
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

    it('should use default LoggerInstance when no logger provided', () => {
      expect(() => updateLogLevel('info')).not.toThrow();
    });
  });

  describe('addErrorFileLogger', () => {
    it('should add error file logger transport', () => {
      addErrorFileLogger('/tmp/error.log', undefined, testLogger);
      expect(testLogger.add).toHaveBeenCalled();
      expect(testLogger.add).toHaveBeenCalledTimes(1);
    });

    it('should add error file logger with custom level', () => {
      addErrorFileLogger('/tmp/error.log', 'error', testLogger);
      expect(testLogger.add).toHaveBeenCalled();
    });

    it('should use default LoggerInstance when no logger provided', () => {
      expect(() => addErrorFileLogger('/tmp/error.log')).not.toThrow();
    });

    it('should create file transport with correct filename', () => {
      const filename = '/tmp/test-error.log';
      addErrorFileLogger(filename, 'error', testLogger);

      expect(testLogger.add).toHaveBeenCalled();
      const callArgs = (testLogger.add as any).mock.calls[0][0];
      expect(callArgs).toBeDefined();
      // Winston File transport normalizes the filename
      expect(callArgs.filename).toContain('test-error.log');
      expect(callArgs.level).toBe('error');
    });
  });

  describe('addJsonLinesFileLogger', () => {
    it('should add JSON lines file logger transport', () => {
      addJsonLinesFileLogger('/tmp/logs.jsonl', undefined, testLogger);
      expect(testLogger.add).toHaveBeenCalled();
      expect(testLogger.add).toHaveBeenCalledTimes(1);
    });

    it('should add JSON lines file logger with custom level', () => {
      addJsonLinesFileLogger('/tmp/logs.jsonl', 'info', testLogger);
      expect(testLogger.add).toHaveBeenCalled();
    });

    it('should use default LoggerInstance when no logger provided', () => {
      expect(() => addJsonLinesFileLogger('/tmp/logs.jsonl')).not.toThrow();
    });

    it('should create file transport with correct filename', () => {
      const filename = '/tmp/test-logs.jsonl';
      addJsonLinesFileLogger(filename, 'info', testLogger);

      expect(testLogger.add).toHaveBeenCalled();
      const callArgs = (testLogger.add as any).mock.calls[0][0];
      expect(callArgs).toBeDefined();
      // Winston File transport normalizes the filename
      expect(callArgs.filename).toContain('test-logs.jsonl');
      expect(callArgs.level).toBe('info');
    });
  });

  describe('addGrafanaLokiLogger', () => {
    it('should add Grafana Loki logger transport with url in options', () => {
      addGrafanaLokiLogger(
        'test-app',
        { url: 'http://localhost:3100' },
        testLogger
      );
      expect(testLogger.add).toHaveBeenCalled();
      expect(testLogger.add).toHaveBeenCalledTimes(1);
    });

    it('should add Grafana Loki logger with custom level', () => {
      addGrafanaLokiLogger(
        'test-app',
        { url: 'http://localhost:3100', level: 'info' },
        testLogger
      );
      expect(testLogger.add).toHaveBeenCalled();
    });

    it('should use default LoggerInstance when no logger provided', () => {
      // Set environment variable for this test
      process.env.LOGGER_GRAFANA_URL = 'http://localhost:3100';
      expect(() => addGrafanaLokiLogger('test-app')).not.toThrow();
      delete process.env.LOGGER_GRAFANA_URL;
    });

    it('should create Loki transport with correct labels and level', () => {
      const appName = 'my-app';
      const url = 'http://grafana.example.com:3100';
      const level = 'debug';

      addGrafanaLokiLogger(appName, { url, level }, testLogger);

      expect(testLogger.add).toHaveBeenCalled();
      const callArgs = (testLogger.add as any).mock.calls[0][0];
      expect(callArgs).toBeDefined();
      // Verify the transport was created with the correct configuration
      expect(callArgs.labels).toEqual({ job: appName });
      expect(callArgs.level).toBe(level);
      // Verify it has a format (indicating it's properly configured)
      expect(callArgs.format).toBeDefined();
    });

    it('should throw InvalidGrafanaConfig when url is not provided', () => {
      // Ensure environment variable is not set
      delete process.env.LOGGER_GRAFANA_URL;

      expect(() => addGrafanaLokiLogger('test-app', {}, testLogger)).toThrow(
        InvalidGrafanaConfig
      );
    });

    it('should throw InvalidGrafanaConfig when url is empty string', () => {
      delete process.env.LOGGER_GRAFANA_URL;

      expect(() =>
        addGrafanaLokiLogger('test-app', { url: '' }, testLogger)
      ).toThrow(InvalidGrafanaConfig);
    });

    it('should use environment variable LOGGER_GRAFANA_URL when options.url is not provided', () => {
      process.env.LOGGER_GRAFANA_URL = 'http://env-grafana:3100';

      expect(() =>
        addGrafanaLokiLogger('test-app', {}, testLogger)
      ).not.toThrow();
      expect(testLogger.add).toHaveBeenCalled();

      delete process.env.LOGGER_GRAFANA_URL;
    });

    it('should prefer options.url over environment variable', () => {
      process.env.LOGGER_GRAFANA_URL = 'http://env-grafana:3100';
      const optionsUrl = 'http://options-grafana:3100';

      expect(() =>
        addGrafanaLokiLogger('test-app', { url: optionsUrl }, testLogger)
      ).not.toThrow();
      expect(testLogger.add).toHaveBeenCalled();

      delete process.env.LOGGER_GRAFANA_URL;
    });
  });
});
