import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { ConfigManagerImpl } from './config-manager.js';
import type { LoadConfigOptions } from './types.js';

const TMP = join(tmpdir(), 'config-manager-impl-tests');

const TestSchema = z.object({
  server: z
    .object({
      host: z.string().default('localhost'),
      port: z.number().default(3000),
    })
    .default({}),
  feature: z
    .object({
      enabled: z.boolean().default(false),
    })
    .default({}),
});

function makeManager(
  data: Record<string, unknown> = {},
  dir = TMP
): ConfigManagerImpl {
  const configPath = join(dir, 'config.yaml');
  const options: LoadConfigOptions = {
    appName: 'test',
    schema: TestSchema,
    configDir: configPath,
  };
  return new ConfigManagerImpl(data, configPath, options);
}

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('ConfigManagerImpl', () => {
  describe('get()', () => {
    it('returns value from _data by dot-path', () => {
      const m = makeManager({ server: { host: 'example.com', port: 8080 } });
      expect(m.get('server.host')).toBe('example.com');
    });

    it('env var takes priority over _data', () => {
      vi.stubEnv('server.host', 'env-host');
      const m = makeManager({ server: { host: 'data-host' } });
      expect(m.get('server.host')).toBe('env-host');
    });

    it('returns defaultValue when key not found', () => {
      const m = makeManager({});
      expect(m.get('missing.key', 'fallback')).toBe('fallback');
    });

    it('returns undefined when key not found and no default', () => {
      const m = makeManager({});
      expect(m.get('missing.key')).toBeUndefined();
    });
  });

  describe('getNumber()', () => {
    it('parses numeric string from env as number', () => {
      vi.stubEnv('server.port', '9090');
      const m = makeManager({});
      expect(m.getNumber('server.port')).toBe(9090);
    });

    it('returns number from _data', () => {
      const m = makeManager({ server: { port: 4000 } });
      expect(m.getNumber('server.port')).toBe(4000);
    });

    it('returns defaultValue when key missing', () => {
      const m = makeManager({});
      expect(m.getNumber('missing', 42)).toBe(42);
    });

    it('returns defaultValue when value is not a valid number', () => {
      const m = makeManager({ server: { port: 'not-a-number' } });
      expect(m.getNumber('server.port', 99)).toBe(99);
    });
  });

  describe('getBoolean()', () => {
    it('returns true when value is the string "true"', () => {
      const m = makeManager({ feature: { enabled: 'true' } });
      expect(m.getBoolean('feature.enabled')).toBe(true);
    });

    it('returns false when value is not "true"', () => {
      const m = makeManager({ feature: { enabled: false } });
      expect(m.getBoolean('feature.enabled')).toBe(false);
    });

    it('returns defaultValue when key missing', () => {
      const m = makeManager({});
      expect(m.getBoolean('missing', true)).toBe(true);
    });
  });

  describe('has()', () => {
    it('returns true for a present non-empty value', () => {
      const m = makeManager({ server: { host: 'example.com' } });
      expect(m.has('server.host')).toBe(true);
    });

    it('returns false for a missing key', () => {
      const m = makeManager({});
      expect(m.has('missing.key')).toBe(false);
    });
  });

  describe('getConfigDir()', () => {
    it('returns the directory containing configPath when no subPath given', () => {
      const m = makeManager({});
      expect(m.getConfigDir()).toBe(TMP);
    });

    it('resolves a subPath relative to the config directory', () => {
      const m = makeManager({});
      const subDir = m.getConfigDir('logs');
      expect(subDir).toBe(join(TMP, 'logs'));
    });

    it('creates the subPath directory if it does not exist', () => {
      const m = makeManager({});
      const subDir = m.getConfigDir('new-sub-dir');
      expect(existsSync(subDir)).toBe(true);
    });
  });

  describe('getSection()', () => {
    it('validates and returns a config section by dot-path', () => {
      const m = makeManager({ server: { host: 'localhost', port: 3000 } });
      const ServerSchema = z.object({
        host: z.string(),
        port: z.number(),
      });
      const section = m.getSection('server', ServerSchema);
      expect(section).toEqual({ host: 'localhost', port: 3000 });
    });

    it('throws when the key is missing', () => {
      const m = makeManager({});
      expect(() => m.getSection('missing', z.object({}))).toThrow(
        'key "missing" not found'
      );
    });

    it('throws and logs formatted errors when Zod validation fails', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const m = makeManager({ server: { host: 123, port: 'not-a-num' } });
      const ServerSchema = z.object({ host: z.string(), port: z.number() });

      expect(() => m.getSection('server', ServerSchema)).toThrow();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Config Errors:'));
    });
  });

  describe('set() and save()', () => {
    it('set() updates _data in-memory', () => {
      const m = makeManager({ server: { host: 'old' } });
      m.set('server.host', 'new');
      expect(m.get('server.host')).toBe('new');
    });

    it('save() persists _data to disk, readable on next load', async () => {
      const { writeConfigFile } = await import('./format.js');
      const configPath = join(TMP, 'config.yaml');
      writeConfigFile(configPath, { server: { host: 'original', port: 3000 }, feature: { enabled: false } });

      const { loadConfig } = await import('./loader.js');
      const m = loadConfig({ appName: 'test', schema: TestSchema, configDir: configPath });

      m.set('server.host', 'updated');
      m.save();

      const m2 = loadConfig({ appName: 'test', schema: TestSchema, configDir: configPath });
      expect(m2.get('server.host')).toBe('updated');
    });
  });

  describe('reload()', () => {
    it('re-reads the config file and updates _data', async () => {
      const { writeConfigFile } = await import('./format.js');
      const configPath = join(TMP, 'config.yaml');
      writeConfigFile(configPath, { server: { host: 'original', port: 3000 }, feature: { enabled: false } });

      const { loadConfig } = await import('./loader.js');
      const m = loadConfig({ appName: 'test', schema: TestSchema, configDir: configPath });

      expect(m.get('server.host')).toBe('original');

      // Simulate external change to the file
      writeConfigFile(configPath, { server: { host: 'reloaded', port: 3000 }, feature: { enabled: false } });

      m.reload();
      expect(m.get('server.host')).toBe('reloaded');
    });
  });
});
