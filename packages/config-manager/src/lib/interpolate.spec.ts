import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { interpolateEnvVars } from './interpolate.js';

beforeEach(() => {
  vi.stubEnv('MY_VAR', 'hello');
  vi.stubEnv('ANOTHER_VAR', 'world');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('interpolateEnvVars', () => {
  describe('string values', () => {
    it('replaces a single ${VAR} token', () => {
      expect(interpolateEnvVars('${MY_VAR}')).toBe('hello');
    });

    it('replaces multiple tokens in the same string', () => {
      expect(interpolateEnvVars('${MY_VAR} ${ANOTHER_VAR}')).toBe(
        'hello world'
      );
    });

    it('substitutes empty string and warns for missing env var', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const result = interpolateEnvVars('${MISSING_VAR}');
      expect(result).toBe('');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('MISSING_VAR')
      );
    });

    it('leaves strings without tokens unchanged', () => {
      expect(interpolateEnvVars('no tokens here')).toBe('no tokens here');
    });

    it('does not match lowercase variable names', () => {
      expect(interpolateEnvVars('${lower_case}')).toBe('${lower_case}');
    });
  });

  describe('non-string primitives', () => {
    it('passes numbers through unchanged', () => {
      expect(interpolateEnvVars(42)).toBe(42);
    });

    it('passes booleans through unchanged', () => {
      expect(interpolateEnvVars(true)).toBe(true);
    });

    it('passes null through unchanged', () => {
      expect(interpolateEnvVars(null)).toBe(null);
    });
  });

  describe('nested objects', () => {
    it('interpolates values inside nested objects', () => {
      const input = { server: { host: '${MY_VAR}', port: 3000 } };
      expect(interpolateEnvVars(input)).toEqual({
        server: { host: 'hello', port: 3000 },
      });
    });

    it('interpolates values inside arrays', () => {
      const input = ['${MY_VAR}', '${ANOTHER_VAR}', 42];
      expect(interpolateEnvVars(input)).toEqual(['hello', 'world', 42]);
    });

    it('interpolates deeply nested values', () => {
      const input = { a: { b: { c: '${MY_VAR}' } } };
      expect(interpolateEnvVars(input)).toEqual({ a: { b: { c: 'hello' } } });
    });
  });
});
