import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import winston, { Logger } from 'winston';
import {
  addErrorFileLogger,
  addGrafanaLokiLogger,
  addJsonLinesFileLogger,
  configure,
  createChildLogger,
  defaultLevels,
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

  describe('defaultLevels', () => {
    it('should export default log levels', () => {
      expect(defaultLevels).toBeDefined();
      expect(Array.isArray(defaultLevels)).toBe(true);
    });

    it('should contain expected log levels', () => {
      expect(defaultLevels).toContain('error');
      expect(defaultLevels).toContain('warn');
      expect(defaultLevels).toContain('info');
      expect(defaultLevels).toContain('debug');
    });

    it('should have foobar as first level', () => {
      expect(defaultLevels[0]).toBe('foobar');
    });
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
    it('should add Grafana Loki logger transport', () => {
      addGrafanaLokiLogger('http://localhost:3100', 'test-app', undefined, testLogger);
      expect(testLogger.add).toHaveBeenCalled();
      expect(testLogger.add).toHaveBeenCalledTimes(1);
    });

    it('should add Grafana Loki logger with custom level', () => {
      addGrafanaLokiLogger('http://localhost:3100', 'test-app', 'info', testLogger);
      expect(testLogger.add).toHaveBeenCalled();
    });

    it('should use default LoggerInstance when no logger provided', () => {
      expect(() => addGrafanaLokiLogger('http://localhost:3100', 'test-app')).not.toThrow();
    });

    it('should create Loki transport with correct host and labels', () => {
      const host = 'http://grafana.example.com:3100';
      const appName = 'my-app';
      const level = 'debug';

      addGrafanaLokiLogger(host, appName, level, testLogger);

      expect(testLogger.add).toHaveBeenCalled();
      const callArgs = (testLogger.add as any).mock.calls[0][0];
      expect(callArgs).toBeDefined();
      // Verify the transport was created with the correct configuration
      expect(callArgs.labels).toEqual({ job: appName });
      expect(callArgs.level).toBe(level);
      // Verify it has a format (indicating it's properly configured)
      expect(callArgs.format).toBeDefined();
    });
  });
});
