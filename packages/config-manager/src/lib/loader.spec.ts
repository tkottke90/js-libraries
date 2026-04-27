import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { loadConfig } from './loader.js';

const TMP = join(tmpdir(), 'config-manager-loader-tests');

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

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('loadConfig', () => {
  it('creates config file with defaults when it does not exist', () => {
    const configDir = join(TMP, 'new-app', 'config.yaml');
    const manager = loadConfig({ appName: 'test', schema: TestSchema, configDir });

    expect(existsSync(configDir)).toBe(true);
    expect(manager._data).toHaveProperty('server');
    expect(manager._data).toHaveProperty('logging');
  });

  it('returns a ConfigManagerImpl with correct configPath', () => {
    const configDir = join(TMP, 'test-app', 'config.yaml');
    const manager = loadConfig({ appName: 'test', schema: TestSchema, configDir });

    expect(manager.configPath).toBe(configDir);
  });

  it('injects runtimeValues into _data', () => {
    const configDir = join(TMP, 'runtime-test', 'config.yaml');
    const manager = loadConfig({
      appName: 'test',
      schema: TestSchema,
      configDir,
      runtimeValues: { appVersion: '1.2.3' },
    });

    expect(manager._data['appVersion']).toBe('1.2.3');
  });

  it('runtimeValues are not persisted to disk', () => {
    const configDir = join(TMP, 'runtime-persist', 'config.yaml');
    loadConfig({
      appName: 'test',
      schema: TestSchema,
      configDir,
      runtimeValues: { appVersion: '1.2.3' },
    });

    // Reload fresh to check disk state
    const manager2 = loadConfig({ appName: 'test', schema: TestSchema, configDir });
    expect(manager2._data['appVersion']).toBeUndefined();
  });

  it('uses configDir option over CONFIG_DIR env var', () => {
    vi.stubEnv('CONFIG_DIR', join(TMP, 'env-dir'));
    const configDir = join(TMP, 'explicit-dir', 'config.yaml');
    const manager = loadConfig({ appName: 'test', schema: TestSchema, configDir });

    expect(manager.configPath).toBe(configDir);
  });

  it('falls back to CONFIG_DIR env var when configDir is not provided', () => {
    const envDir = join(TMP, 'env-config-dir');
    vi.stubEnv('CONFIG_DIR', envDir);
    const manager = loadConfig({ appName: 'test', schema: TestSchema });

    expect(manager.configPath).toBe(join(envDir, 'config.yaml'));
  });

  it('appends config.yaml when configDir is a directory path', () => {
    const configDir = join(TMP, 'dir-only');
    const manager = loadConfig({ appName: 'test', schema: TestSchema, configDir });

    expect(manager.configPath).toBe(join(configDir, 'config.yaml'));
  });

  it('throws when configDir has an unsupported file extension', () => {
    const configDir = join(TMP, 'app', 'config.toml');
    expect(() =>
      loadConfig({ appName: 'test', schema: TestSchema, configDir })
    ).toThrow('Unsupported config file extension ".toml"');
  });

  it('reads and interpolates env vars from an existing config file', async () => {
    const configDir = join(TMP, 'interpolate-test', 'config.yaml');
    vi.stubEnv('MY_HOST', 'myhost.example.com');

    const { writeConfigFile } = await import('./format.js');
    mkdirSync(join(TMP, 'interpolate-test'), { recursive: true });
    writeConfigFile(configDir, { server: { host: '${MY_HOST}', port: 3000 }, logging: { level: 'info' } });

    const manager = loadConfig({ appName: 'test', schema: TestSchema, configDir });
    expect(manager.get('server.host')).toBe('myhost.example.com');
  });
});
