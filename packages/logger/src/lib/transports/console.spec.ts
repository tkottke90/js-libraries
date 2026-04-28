/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import winston from 'winston';
import { CONSOLE_FORMAT, addConsoleLogger } from './console.js';

// ---------------------------------------------------------------------------
// Helper: run a log through CONSOLE_FORMAT and capture the formatted string.
// Winston stores the printf result at info[Symbol.for('message')] after the
// format chain transforms the info object.
// ---------------------------------------------------------------------------
function formatLog(info: Record<string, unknown>): string {
  class CapturingTransport extends winston.Transport {
    captured = '';
    override log(logInfo: any, callback: () => void) {
      this.captured = logInfo[Symbol.for('message')];
      callback();
    }
  }

  const capture = new CapturingTransport();

  const logger = winston.createLogger({
    levels: { error: 0, warn: 1, info: 2, debug: 3 },
    level: 'debug',
    format: CONSOLE_FORMAT,
    transports: [capture],
  });

  const { level = 'info', message = '', ...rest } = info;
  (logger as any)[level as string](message, rest);

  return capture.captured;
}

// ---------------------------------------------------------------------------

describe('addConsoleLogger', () => {
  it('should return a Console transport instance', () => {
    const transport = addConsoleLogger();
    expect(transport).toBeInstanceOf(winston.transports.Console);
  });

  it('should default level to "info" when no options are provided', () => {
    const transport = addConsoleLogger();
    expect(transport.level).toBe('info');
  });

  it('should apply a level override from options', () => {
    const transport = addConsoleLogger({ level: 'debug' });
    expect(transport.level).toBe('debug');
  });

  it('should apply the CONSOLE_FORMAT', () => {
    const transport = addConsoleLogger();
    expect(transport.format).toBeDefined();
  });
});

describe('CONSOLE_FORMAT', () => {
  it('should include the log level uppercased in the output', () => {
    const output = formatLog({ level: 'info', message: 'test message' });
    expect(output).toContain('[INFO]');
  });

  it('should include the message in the output', () => {
    const output = formatLog({ level: 'info', message: 'hello world' });
    expect(output).toContain('hello world');
  });

  it('should include a timestamp in the output', () => {
    const output = formatLog({ level: 'info', message: 'ts check' });
    // ISO-style timestamp contains digits and dashes/colons
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('should include "[api]" as the default location prefix', () => {
    const output = formatLog({ level: 'info', message: 'location test' });
    expect(output).toContain('[api]');
  });

  it('should append location to prefix when provided', () => {
    const output = formatLog({ level: 'info', message: 'with location', location: 'users' });
    expect(output).toContain('[api.users]');
  });

  it('should not include the default "[api]" prefix without a dot when location is given', () => {
    const output = formatLog({ level: 'info', message: 'with location', location: 'orders' });
    // Should be [api.orders] not just [api]
    expect(output).not.toMatch(/\[api\][^.].*\[/);
    expect(output).toContain('[api.orders]');
  });

  it('should omit the meta JSON when no extra fields are present', () => {
    const output = formatLog({ level: 'info', message: 'no meta' });
    // No trailing braces — the metaString should be empty
    expect(output.trim()).not.toMatch(/\{.*\}$/);
  });

  it('should append JSON meta when extra fields are present', () => {
    const output = formatLog({ level: 'info', message: 'with meta', requestId: 'abc-123' });
    expect(output).toContain('"requestId"');
    expect(output).toContain('abc-123');
  });

  it('should include multiple meta fields in the JSON output', () => {
    const output = formatLog({ level: 'warn', message: 'multi meta', userId: 42, action: 'delete' });
    expect(output).toContain('"userId"');
    expect(output).toContain('"action"');
  });
});
