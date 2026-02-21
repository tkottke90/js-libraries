import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createClientMethod } from './express-client.js';
import { HttpError } from './http-error.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('createClientMethod', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HTTP Methods', () => {
    it('should make a GET request', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const getMethod = createClientMethod('/api/data', { method: 'get' });
      const response = await getMethod({});

      expect(mockFetch).toHaveBeenCalledWith('/api/data', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
      });
      expect(response).toBe(mockResponse);
    });

    it('should make a POST request', async () => {
      const mockResponse = new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        statusText: 'Created',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({ name: z.string() });
      const postMethod = createClientMethod('/api/users', {
        method: 'post',
        inputSchema: schema,
      });
      
      const response = await postMethod({ name: 'John' });

      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John' }),
      });
      expect(response).toBe(mockResponse);
    });

    it('should make a PUT request', async () => {
      const mockResponse = new Response(JSON.stringify({ updated: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({ id: z.number(), status: z.string() });
      const putMethod = createClientMethod('/api/status', {
        method: 'put',
        inputSchema: schema,
      });
      
      const response = await putMethod({ id: 1, status: 'active' });

      expect(mockFetch).toHaveBeenCalledWith('/api/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, status: 'active' }),
      });
      expect(response.status).toBe(200);
    });

    it('should make a DELETE request', async () => {
      const mockResponse = new Response(null, {
        status: 204,
        statusText: 'No Content',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({ id: z.number() });
      const deleteMethod = createClientMethod('/api/users', {
        method: 'delete',
        inputSchema: schema,
      });
      
      await deleteMethod({ id: 1 });

      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1 }),
      });
    });

    it('should make a PATCH request', async () => {
      const mockResponse = new Response(JSON.stringify({ patched: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({ field: z.string() });
      const patchMethod = createClientMethod('/api/resource', {
        method: 'patch',
        inputSchema: schema,
      });
      
      await patchMethod({ field: 'value' });

      expect(mockFetch).toHaveBeenCalledWith('/api/resource', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'value' }),
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate input with Zod schema', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });
      
      const method = createClientMethod('/api/validate', {
        method: 'post',
        inputSchema: schema,
      });

      await method({ email: 'test@example.com', age: 25 });

      expect(mockFetch).toHaveBeenCalledWith('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', age: 25 }),
      });
    });

    it('should throw ZodError on invalid input', async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });
      
      const method = createClientMethod('/api/validate', {
        method: 'post',
        inputSchema: schema,
      });

      try {
        await method({ email: 'invalid-email', age: 15 } as { email: string; age: number });
        expect.fail('Should have thrown a ZodError');
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        expect((error as z.ZodError).issues).toHaveLength(2);
        expect((error as z.ZodError).issues[0].path).toEqual(['email']);
        expect((error as z.ZodError).issues[1].path).toEqual(['age']);
      }
    });

    it('should work without input schema', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/no-validation', { method: 'get' });
      
      await method({});

      expect(mockFetch).toHaveBeenCalledWith('/api/no-validation', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
      });
    });
  });

  describe('Output Processor', () => {
    it('should process response with output processor', async () => {
      const mockData = { id: 1, name: 'Test User' };
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({ id: z.number() });
      const method = createClientMethod(
        '/api/user',
        { method: 'get', inputSchema: schema },
        async (response) => response.json()
      );

      const result = await method({ id: 1 });

      expect(result).toEqual(mockData);
    });

    it('should handle custom output processor', async () => {
      const mockResponse = new Response('plain text', {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod(
        '/api/text',
        { method: 'get' },
        async (response) => response.text()
      );

      const result = await method({});

      expect(result).toBe('plain text');
    });

    it('should handle synchronous output processor', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod(
        '/api/headers',
        { method: 'get' },
        (response) => response.headers.get('Content-Type')
      );

      const result = await method({});

      expect(result).toBe('application/json');
    });

    it('should return raw Response when no output processor provided', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/raw', { method: 'get' });

      const result = await method({});

      expect(result).toBe(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should throw HttpError on 404 response', async () => {
      const mockResponse = new Response(null, {
        status: 404,
        statusText: 'Not Found',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/missing', { method: 'get' });

      await expect(method({})).rejects.toThrow(HttpError);
      await expect(method({})).rejects.toThrow('HTTP Error: 404 Not Found');
    });

    it('should throw HttpError on 500 response', async () => {
      const mockResponse = new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/error', { method: 'post' });

      await expect(method({})).rejects.toThrow(HttpError);
    });

    it('should throw HttpError with correct status and message', async () => {
      const mockResponse = new Response(null, {
        status: 403,
        statusText: 'Forbidden',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/forbidden', { method: 'get' });

      try {
        await method({});
        expect.fail('Should have thrown HttpError');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(403);
        expect((error as HttpError).statusMessage).toBe('Forbidden');
        expect((error as HttpError).message).toBe('HTTP Error: 403 Forbidden');
      }
    });

    it('should throw HttpError on 400 Bad Request', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Invalid data' }), {
        status: 400,
        statusText: 'Bad Request',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({ name: z.string() });
      const method = createClientMethod('/api/create', {
        method: 'post',
        inputSchema: schema,
      });

      await expect(method({ name: 'test' })).rejects.toThrow(HttpError);
    });

    it('should not call output processor when response is not ok', async () => {
      const mockResponse = new Response(null, {
        status: 404,
        statusText: 'Not Found',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const outputProcessor = vi.fn();
      const method = createClientMethod(
        '/api/error',
        { method: 'get' },
        outputProcessor
      );

      await expect(method({})).rejects.toThrow(HttpError);
      expect(outputProcessor).not.toHaveBeenCalled();
    });
  });

  describe('Custom RequestInit Options', () => {
    it('should merge custom headers with default headers', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/custom', { method: 'get' });
      
      await method({}, {
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/custom', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
        body: undefined,
      });
    });

    it('should allow overriding default Content-Type header', async () => {
      const mockResponse = new Response(null, {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/xml', { method: 'post' });
      
      await method({}, {
        headers: {
          'Content-Type': 'application/xml',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/xml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: undefined,
      });
    });

    it('should pass through other RequestInit options', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/options', { method: 'get' });
      
      await method({}, {
        credentials: 'include',
        mode: 'cors',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/options', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        credentials: 'include',
        mode: 'cors',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input object', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({});
      const method = createClientMethod('/api/empty', {
        method: 'post',
        inputSchema: schema,
      });

      await method({});

      expect(mockFetch).toHaveBeenCalledWith('/api/empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    });

    it('should handle complex nested input schema', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            street: z.string(),
            city: z.string(),
          }),
        }),
        tags: z.array(z.string()),
      });

      const method = createClientMethod('/api/complex', {
        method: 'post',
        inputSchema: schema,
      });

      const input = {
        user: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'Boston',
          },
        },
        tags: ['tag1', 'tag2'],
      };

      await method(input);

      expect(mockFetch).toHaveBeenCalledWith('/api/complex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    });

    it('should handle 204 No Content response', async () => {
      const mockResponse = new Response(null, {
        status: 204,
        statusText: 'No Content',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod('/api/delete', { method: 'delete' });

      const result = await method({});

      expect(result).toBe(mockResponse);
    });

    it('should handle network failure', async () => {
      const networkError = new Error('Network request failed');
      mockFetch.mockRejectedValue(networkError);

      const method = createClientMethod('/api/network', { method: 'get' });

      await expect(method({})).rejects.toThrow('Network request failed');
    });

    it('should handle JSON parsing error in output processor', async () => {
      const mockResponse = new Response('invalid json', {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const method = createClientMethod(
        '/api/invalid',
        { method: 'get' },
        async (response) => response.json()
      );

      await expect(method({})).rejects.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with schemas', async () => {
      const mockResponse = new Response(JSON.stringify({ id: 1, name: 'Test' }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const inputSchema = z.object({
        email: z.string().email(),
        age: z.number(),
      });

      type OutputType = { id: number; name: string };

      const method = createClientMethod(
        '/api/typed',
        { method: 'post', inputSchema },
        async (response) => response.json() as Promise<OutputType>
      );

      // This should compile correctly
      const result = await method({ email: 'test@example.com', age: 30 });

      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('should work with optional schema properties', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const method = createClientMethod('/api/optional', {
        method: 'post',
        inputSchema: schema,
      });

      await method({ required: 'value' });

      expect(mockFetch).toHaveBeenCalledWith('/api/optional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ required: 'value' }),
      });
    });
  });
});
