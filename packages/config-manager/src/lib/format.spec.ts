import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readConfigFile, writeConfigFile, detectFormat } from './format.js';

const TMP = join(tmpdir(), 'config-manager-format-tests');

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe('detectFormat', () => {
  it('returns yaml for .yaml extension', () => {
    expect(detectFormat('/some/path/config.yaml')).toBe('yaml');
  });

  it('returns yaml for .yml extension', () => {
    expect(detectFormat('/some/path/config.yml')).toBe('yaml');
  });

  it('returns json for .json extension', () => {
    expect(detectFormat('/some/path/config.json')).toBe('json');
  });

  it('is case-insensitive', () => {
    expect(detectFormat('/some/path/config.YAML')).toBe('yaml');
    expect(detectFormat('/some/path/config.JSON')).toBe('json');
  });

  it('throws on unsupported extension', () => {
    expect(() => detectFormat('/some/path/config.toml')).toThrow(
      'Unsupported config file extension'
    );
  });
});

describe('readConfigFile', () => {
  it('reads a YAML file into an object', () => {
    const filePath = join(TMP, 'config.yaml');
    writeFileSync(filePath, 'server:\n  port: 3000\n', 'utf8');

    const result = readConfigFile(filePath);
    expect(result).toEqual({ server: { port: 3000 } });
  });

  it('reads a JSON file into an object', () => {
    const filePath = join(TMP, 'config.json');
    writeFileSync(filePath, JSON.stringify({ server: { port: 3000 } }), 'utf8');

    const result = readConfigFile(filePath);
    expect(result).toEqual({ server: { port: 3000 } });
  });

  it('returns empty object for empty YAML file', () => {
    const filePath = join(TMP, 'config.yaml');
    writeFileSync(filePath, '', 'utf8');

    const result = readConfigFile(filePath);
    expect(result).toEqual({});
  });
});

describe('writeConfigFile', () => {
  it('writes YAML format', () => {
    const filePath = join(TMP, 'config.yaml');
    writeConfigFile(filePath, { server: { port: 3000 } });

    const result = readConfigFile(filePath);
    expect(result).toEqual({ server: { port: 3000 } });
  });

  it('writes JSON format', () => {
    const filePath = join(TMP, 'config.json');
    writeConfigFile(filePath, { server: { port: 3000 } });

    const result = readConfigFile(filePath);
    expect(result).toEqual({ server: { port: 3000 } });
  });

  it('round-trips nested objects correctly in YAML', () => {
    const filePath = join(TMP, 'config.yaml');
    const data = { a: { b: { c: 'deep' } }, arr: [1, 2, 3] };
    writeConfigFile(filePath, data);
    expect(readConfigFile(filePath)).toEqual(data);
  });
});
