import { describe, expect, it } from 'vitest';
import { BaseError } from './js-errors.js';

describe('BaseError', () => {
  describe('constructor', () => {
    it('should create an error with a message', () => {
      const message = 'Test error message';
      const error = new BaseError(message);

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
    });

    it('should create an error with metadata', () => {
      const message = 'Test error';
      const metadata = { userId: 123, action: 'login' };
      const error = new BaseError(message, metadata);

      expect(error.metadata).toEqual(metadata);
    });

    it('should create an error with empty metadata by default', () => {
      const error = new BaseError('Test error');

      expect(error.metadata).toEqual({});
    });

    it('should set the name property to BaseError', () => {
      const error = new BaseError('Test error');

      expect(error.name).toBe('BaseError');
    });
  });

  describe('toString', () => {
    it('should return formatted string with message and no metadata', () => {
      const message = 'Test error';
      const error = new BaseError(message);

      expect(error.toString()).toBe('BaseError (message: Test error )');
    });

    it('should return formatted string with message and metadata', () => {
      const message = 'Test error';
      const metadata = { userId: 123, action: 'login' };
      const error = new BaseError(message, metadata);

      const result = error.toString();
      expect(result).toContain('BaseError (message: Test error');
      expect(result).toContain('userId:123');
      expect(result).toContain('action:login');
      expect(result).toContain(')');
    });

    it('should handle multiple metadata entries', () => {
      const metadata = {
        code: 'ERR_001',
        severity: 'high',
        timestamp: '2024-01-01',
      };
      const error = new BaseError('Error occurred', metadata);

      const result = error.toString();
      expect(result).toContain('code:ERR_001');
      expect(result).toContain('severity:high');
      expect(result).toContain('timestamp:2024-01-01');
    });

    it('should handle metadata with special characters', () => {
      const metadata = {
        message: 'Error: something went wrong',
        path: '/api/users',
      };
      const error = new BaseError('Test', metadata);

      const result = error.toString();
      expect(result).toContain('message:Error: something went wrong');
      expect(result).toContain('path:/api/users');
    });
  });

  describe('toJSON', () => {
    it('should return JSON object with message and name', () => {
      const message = 'Test error';
      const error = new BaseError(message);

      const json = error.toJSON();
      expect(json.message).toBe(message);
      expect(json.name).toBe('BaseError');
    });

    it('should include metadata in JSON output', () => {
      const metadata = { userId: 123, action: 'login' };
      const error = new BaseError('Test error', metadata);

      const json = error.toJSON();
      expect(json.userId).toBe(123);
      expect(json.action).toBe('login');
    });

    it('should include stack trace in JSON output', () => {
      const error = new BaseError('Test error');

      const json = error.toJSON();
      expect(json.stack).toBeDefined();
      expect(typeof json.stack).toBe('string');
    });

    it('should include cause in JSON output', () => {
      const error = new BaseError('Test error');

      const json = error.toJSON();
      expect(json.cause).toBeDefined();
    });

    it('should use Unknown Cause when cause is not set', () => {
      const error = new BaseError('Test error');

      const json = error.toJSON();
      expect(json.cause).toBe('Unknown Cause');
    });

    it('should include cause when it is set', () => {
      const error = new BaseError('Test error');
      error.cause = 'Original error';

      const json = error.toJSON();
      expect(json.cause).toBe('Original error');
    });

    it('should merge metadata with error properties in JSON', () => {
      const metadata = { userId: 123, requestId: 'abc-123' };
      const error = new BaseError('Test error', metadata);

      const json = error.toJSON();
      expect(json).toEqual({
        userId: 123,
        requestId: 'abc-123',
        name: 'BaseError',
        message: 'Test error',
        stack: expect.any(String),
        cause: 'Unknown Cause',
      });
    });

    it('should handle empty metadata in JSON output', () => {
      const error = new BaseError('Test error', {});

      const json = error.toJSON();
      expect(json.name).toBe('BaseError');
      expect(json.message).toBe('Test error');
      expect(Object.keys(json)).toContain('stack');
      expect(Object.keys(json)).toContain('cause');
    });
  });

  describe('inheritance', () => {
    it('should be an instance of Error', () => {
      const error = new BaseError('Test error');

      expect(error instanceof Error).toBe(true);
    });

    it('should have Error prototype methods', () => {
      const error = new BaseError('Test error');

      expect(typeof error.toString).toBe('function');
      expect(error.stack).toBeDefined();
    });
  });

  describe('fromCatch', () => {
    it('should return the same BaseError instance if error is already a BaseError', () => {
      const originalError = new BaseError('Original error', {
        code: 'ERR_001',
      });
      const result = BaseError.fromCatch(originalError);

      expect(result).toBe(originalError);
      expect(result.message).toBe('Original error');
      expect(result.metadata).toEqual({ code: 'ERR_001' });
    });

    it('should convert a standard Error to BaseError', () => {
      const standardError = new Error('Standard error message');
      const result = BaseError.fromCatch(standardError);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Standard error message');
    });

    it('should convert an error object with message property', () => {
      const errorObj = { message: 'Custom error', code: 'ERR_123' };
      const result = BaseError.fromCatch(errorObj);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Custom error');
      expect(result.metadata.code).toBe('ERR_123');
    });

    it('should stringify non-Error objects without message property', () => {
      const unknownError = { status: 500, details: 'Server error' };
      const result = BaseError.fromCatch(unknownError);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toContain('status');
      expect(result.message).toContain('500');
    });

    it('should throw when handling string errors (primitives not supported)', () => {
      const stringError = 'This is a string error';

      expect(() => BaseError.fromCatch(stringError)).toThrow();
    });

    it('should throw when handling null errors (primitives not supported)', () => {
      expect(() => BaseError.fromCatch(null)).toThrow();
    });

    it('should throw when handling undefined errors (primitives not supported)', () => {
      expect(() => BaseError.fromCatch(undefined)).toThrow();
    });

    it('should throw when handling numeric errors (primitives not supported)', () => {
      expect(() => BaseError.fromCatch(404)).toThrow();
    });

    it('should extract all error properties as metadata', () => {
      const errorObj = {
        message: 'Error occurred',
        code: 'ERR_500',
        statusCode: 500,
        timestamp: '2024-01-01T00:00:00Z',
      };
      const result = BaseError.fromCatch(errorObj);

      expect(result.metadata.code).toBe('ERR_500');
      expect(result.metadata.statusCode).toBe(500);
      expect(result.metadata.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle Error objects with additional properties', () => {
      const error = new Error('Base error');
      (error as any).code = 'ERR_CUSTOM';
      (error as any).context = { userId: 123 };

      const result = BaseError.fromCatch(error);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Base error');
      expect(result.metadata.code).toBe('ERR_CUSTOM');
      expect(result.metadata.context).toEqual({ userId: 123 });
    });

    it('should handle complex nested objects', () => {
      const complexError = {
        message: 'Complex error',
        nested: {
          level1: {
            level2: 'deep value',
          },
        },
        array: [1, 2, 3],
      };
      const result = BaseError.fromCatch(complexError);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Complex error');
      expect(result.metadata.nested).toEqual({
        level1: {
          level2: 'deep value',
        },
      });
      expect(result.metadata.array).toEqual([1, 2, 3]);
    });

    it('should handle errors with circular references gracefully', () => {
      const errorObj: any = { message: 'Circular error' };
      errorObj.self = errorObj; // Create circular reference

      // Should not throw
      expect(() => BaseError.fromCatch(errorObj)).not.toThrow();
      const result = BaseError.fromCatch(errorObj);
      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Circular error');
    });

    it('should handle errors with symbol properties', () => {
      const sym = Symbol('test');
      const errorObj = {
        message: 'Error with symbol',
        [sym]: 'symbol value',
      };

      const result = BaseError.fromCatch(errorObj);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Error with symbol');
      // Symbol properties are not enumerable by Object.entries
      expect(result.metadata[sym as any]).toBeUndefined();
    });

    it('should not include non-enumerable Error properties in metadata', () => {
      const originalError = new Error('Original');
      const result = BaseError.fromCatch(originalError);

      // Error properties like 'message' are not enumerable, so they won't be in metadata
      expect(result.metadata.message).toBeUndefined();
      // But the message is extracted and used as the BaseError message
      expect(result.message).toBe('Original');
    });

    it('should handle TypeError objects', () => {
      const typeError = new TypeError('Type mismatch');
      const result = BaseError.fromCatch(typeError);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Type mismatch');
    });

    it('should handle ReferenceError objects', () => {
      const refError = new ReferenceError('Variable not defined');
      const result = BaseError.fromCatch(refError);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Variable not defined');
    });

    it('should handle SyntaxError objects', () => {
      const syntaxError = new SyntaxError('Invalid syntax');
      const result = BaseError.fromCatch(syntaxError);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Invalid syntax');
    });

    it('should create a new BaseError instance (not modify original)', () => {
      const originalError = new Error('Original');
      const result = BaseError.fromCatch(originalError);

      expect(result).not.toBe(originalError);
      expect(result).toBeInstanceOf(BaseError);
    });

    it('should handle empty objects', () => {
      const emptyObj = {};
      const result = BaseError.fromCatch(emptyObj);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe(JSON.stringify(emptyObj));
      expect(result.metadata).toEqual({});
    });

    it('should handle objects with only message property', () => {
      const obj = { message: 'Only message' };
      const result = BaseError.fromCatch(obj);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Only message');
      expect(result.metadata.message).toBe('Only message');
    });

    it('should throw when handling boolean values (primitives not supported)', () => {
      expect(() => BaseError.fromCatch(true)).toThrow();
    });

    it('should handle array errors', () => {
      const arrayError = ['error', 'details'];
      const result = BaseError.fromCatch(arrayError);

      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe(JSON.stringify(arrayError));
    });
  });
});
