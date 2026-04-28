/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import winston from 'winston';
import { addErrorFileLogger, addFileLogger } from './json-lines.js';

describe('addFileLogger', () => {
  it('should return a File transport instance', () => {
    const transport = addFileLogger('/tmp/app.log');
    expect(transport).toBeInstanceOf(winston.transports.File);
  });

  it('should set the filename on the transport', () => {
    const transport = addFileLogger('/tmp/app.log') as any;
    expect(transport.filename).toContain('app.log');
  });

  it('should apply the JSON_LINES_FORMAT', () => {
    const transport = addFileLogger('/tmp/app.log');
    expect(transport.format).toBeDefined();
  });

  it('should apply an optional level override', () => {
    const transport = addFileLogger('/tmp/app.log', { level: 'warn' });
    expect(transport.level).toBe('warn');
  });

  it('should leave level unset when no options are provided', () => {
    const transport = addFileLogger('/tmp/app.log');
    // Winston File transport has no default level restriction — it inherits from the logger
    expect(transport.level).toBeUndefined();
  });

  it('should respect a custom filename provided in options', () => {
    const transport = addFileLogger('/tmp/custom.log') as any;
    expect(transport.filename).toContain('custom.log');
  });
});

describe('addErrorFileLogger', () => {
  it('should return a File transport instance', () => {
    const transport = addErrorFileLogger('/tmp/error.log');
    expect(transport).toBeInstanceOf(winston.transports.File);
  });

  it('should set the filename on the transport', () => {
    const transport = addErrorFileLogger('/tmp/error.log') as any;
    expect(transport.filename).toContain('error.log');
  });

  it('should always force level to "error"', () => {
    const transport = addErrorFileLogger('/tmp/error.log');
    expect(transport.level).toBe('error');
  });

  it('should force level to "error" even when options specifies a different level', () => {
    // level is spread last in the implementation so it always wins
    const transport = addErrorFileLogger('/tmp/error.log', { level: 'info' } as any);
    expect(transport.level).toBe('error');
  });

  it('should set maxsize to 10 MB', () => {
    const transport = addErrorFileLogger('/tmp/error.log') as any;
    expect(transport.maxsize).toBe(10 * 1024 * 1024);
  });

  it('should set maxFiles to 5', () => {
    const transport = addErrorFileLogger('/tmp/error.log') as any;
    expect(transport.maxFiles).toBe(5);
  });

  it('should set tailable to true', () => {
    const transport = addErrorFileLogger('/tmp/error.log') as any;
    expect(transport.tailable).toBe(true);
  });

  it('should apply the JSON_LINES_FORMAT', () => {
    const transport = addErrorFileLogger('/tmp/error.log');
    expect(transport.format).toBeDefined();
  });
});
