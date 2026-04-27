import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import * as formatModule from './format.js';
import { formatZodErrors, validateAndMigrate } from './validate.js';

const TMP = join(tmpdir(), 'config-manager-validate-tests');

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const TestSchema = z.object({
  server: z
    .object({
      host: z.string().default('localhost'),
      port: z.number().default(3000),
    })
    .default({}),
  logging: z
    .object({
      level: z.string().default('info'),
    })
    .default({}),
});

describe('formatZodErrors', () => {
  it('formats a single issue', () => {
    const issues = [
      { path: ['server', 'port'], message: 'Expected number', code: 'invalid_type' } as Parameters<typeof formatZodErrors>[0][0],
    ];
    const result = formatZodErrors(issues);
    expect(result).toContain('Config Errors:');
    expect(result).toContain('===========');
    expect(result).toContain('[server.port]: Expected number');
  });

  it('formats multiple issues', () => {
    const issues = [
      { path: ['core', 'host'], message: 'Must be a string', code: 'invalid_type' },
      { path: ['server', 'port'], message: 'Must be a number', code: 'invalid_type' },
    ] as Parameters<typeof formatZodErrors>[0];
    const result = formatZodErrors(issues);
    expect(result).toContain('[core.host]: Must be a string');
    expect(result).toContain('[server.port]: Must be a number');
  });

  it('joins nested path segments with dots', () => {
    const issues = [
      { path: ['a', 'b', 'c'], message: 'Too deep', code: 'invalid_type' },
    ] as Parameters<typeof formatZodErrors>[0];
    expect(formatZodErrors(issues)).toContain('[a.b.c]: Too deep');
  });

  it('handles an empty issues array', () => {
    const result = formatZodErrors([]);
    expect(result).toContain('Config Errors:');
    expect(result).toContain('===========');
  });
});

describe('validateAndMigrate', () => {
  it('returns valid data unchanged and does not write file', () => {
    const filePath = join(TMP, 'config.yaml');
    const writeSpy = vi.spyOn(formatModule, 'writeConfigFile').mockImplementation(() => undefined);

    const data = { server: { host: 'localhost', port: 3000 }, logging: { level: 'info' } };
    const result = validateAndMigrate(data, TestSchema, filePath);

    expect(result).toEqual(data);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('fills missing top-level keys from defaults and saves', () => {
    const filePath = join(TMP, 'config.yaml');
    const writeSpy = vi.spyOn(formatModule, 'writeConfigFile').mockImplementation(() => undefined);

    const data = { server: { host: 'localhost', port: 3000 } };
    const result = validateAndMigrate(data, TestSchema, filePath);

    expect(result).toHaveProperty('logging');
    expect(writeSpy).toHaveBeenCalledWith(filePath, expect.objectContaining({ logging: expect.any(Object) }));
  });

  it('recovers from schema failure by merging defaults and saves', () => {
    const filePath = join(TMP, 'config.yaml');
    const writeSpy = vi.spyOn(formatModule, 'writeConfigFile').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // Port should be a number — providing a string to trigger failure
    const data = { server: { host: 'localhost', port: 'not-a-number' }, logging: { level: 'info' } };
    const result = validateAndMigrate(data as unknown as Record<string, unknown>, TestSchema, filePath);

    expect(result.server).toBeDefined();
    expect(writeSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Config Errors:'));
  });
});
