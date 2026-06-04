import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    .default({ host: 'localhost', port: 3000 }),
  logging: z
    .object({
      level: z.string().default('info'),
    })
    .default({ level: 'info' }),
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

  it('writes back when Zod injects nested defaults for a new field inside an existing object', () => {
    const filePath = join(TMP, 'config.yaml');
    const writeSpy = vi.spyOn(formatModule, 'writeConfigFile').mockImplementation(() => undefined);

    // Schema adds a new nested field `logging.pretty` that is not present in the on-disk data
    const ExtendedSchema = z.object({
      server: z.object({
        host: z.string().default('localhost'),
        port: z.number().default(3000),
      }).default({ host: 'localhost', port: 3000 }),
      logging: z.object({
        level: z.string().default('info'),
        pretty: z.boolean().default(false), // new nested field
      }).default({ level: 'info', pretty: false }),
    });

    // Simulate existing on-disk data that is missing the new nested field
    const data: Record<string, unknown> = {
      server: { host: 'localhost', port: 3000 },
      logging: { level: 'warn' }, // missing 'pretty'
    };

    const result = validateAndMigrate(data, ExtendedSchema, filePath);

    expect(result['logging']).toHaveProperty('pretty', false);
    // File must be written back so the new field is persisted
    expect(writeSpy).toHaveBeenCalledWith(filePath, expect.objectContaining({
      logging: expect.objectContaining({ pretty: false }),
    }));
  });

  it('recovers from schema failure by merging defaults and saves', () => {
    const filePath = join(TMP, 'config.yaml');
    const writeSpy = vi.spyOn(formatModule, 'writeConfigFile').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // port: 'not-a-number' makes both the initial parse AND the recovery merge fail.
    // When merge({}, defaults, working) still yields an invalid port, schema.parse rejects,
    // and the function falls back to pure defaults.
    const data = { server: { host: 'myhost', port: 'not-a-number' }, logging: { level: 'warn' } };
    const result = validateAndMigrate(data as unknown as Record<string, unknown>, TestSchema, filePath);

    expect((result.server as Record<string, unknown>)['port']).toBe(3000);
    expect(writeSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Config Errors:'));
  });

  it('writeBack: false — does not write file even when defaults would expand the config', () => {
    const filePath = join(TMP, 'config.yaml');
    const writeSpy = vi.spyOn(formatModule, 'writeConfigFile').mockImplementation(() => undefined);

    const data = { server: { host: 'localhost', port: 3000 } }; // missing logging
    const result = validateAndMigrate(data, TestSchema, filePath, false);

    expect(result).toHaveProperty('logging');
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('writeBack: false — throws ZodError on invalid field instead of recovering', () => {
    const filePath = join(TMP, 'config.yaml');
    const writeSpy = vi.spyOn(formatModule, 'writeConfigFile').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const data = { server: { host: 'localhost', port: 'not-a-number' }, logging: { level: 'info' } };
    expect(() =>
      validateAndMigrate(data as unknown as Record<string, unknown>, TestSchema, filePath, false)
    ).toThrow();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('onCorruptConfig: backup-and-reset — creates .corrupt file and writes fresh defaults to disk', () => {
    const filePath = join(TMP, 'config.yaml');
    const corruptPath = `${filePath}.corrupt`;
    const originalContent = 'server:\n  host: myhost\n  port: not-a-number\n';
    writeFileSync(filePath, originalContent);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const data = { server: { host: 'myhost', port: 'not-a-number' }, logging: { level: 'info' } };
    const result = validateAndMigrate(
      data as unknown as Record<string, unknown>,
      TestSchema,
      filePath,
      true,
      'backup-and-reset'
    );

    // .corrupt file must exist and contain the original corrupt content
    expect(existsSync(corruptPath)).toBe(true);
    expect(readFileSync(corruptPath, 'utf8')).toBe(originalContent);
    // Config file is reset to schema defaults
    expect((result.server as Record<string, unknown>)['port']).toBe(3000);
    expect((result.server as Record<string, unknown>)['host']).toBe('localhost');
  });

  it('onCorruptConfig: backup-and-reset — overwrites an existing .corrupt file with the latest corrupt content', () => {
    const filePath = join(TMP, 'config.yaml');
    const corruptPath = `${filePath}.corrupt`;
    const latestCorruptContent = 'server:\n  host: myhost\n  port: not-a-number\n';
    writeFileSync(filePath, latestCorruptContent);
    writeFileSync(corruptPath, 'old corrupt contents');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const data = { server: { host: 'myhost', port: 'not-a-number' }, logging: { level: 'info' } };
    validateAndMigrate(
      data as unknown as Record<string, unknown>,
      TestSchema,
      filePath,
      true,
      'backup-and-reset'
    );

    expect(readFileSync(corruptPath, 'utf8')).toBe(latestCorruptContent);
  });
});
