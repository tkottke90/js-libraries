import { z } from 'zod';
import { HttpError } from './http-error.js';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

type FunctionSchema<T> = T extends z.ZodTypeAny ? z.infer<T> : never;

// Extract the return type from outputProcessor and handle Promise unwrapping
type OutputProcessorReturnType<T> = T extends (response: Response) => infer R
  ? R extends Promise<infer U>
    ? U  // Unwrap Promise
    : R  // Keep non-Promise as-is
  : Response;  // Default to Response when no processor

interface ClientMethodOptions<Input extends z.ZodTypeAny | undefined> {
  method: HttpMethod;
  inputSchema?: Input;
  acceptedTypes?: string[];
}

/**
 * Creates a type-safe HTTP client method with input validation and optional response processing.
 * This overload includes an output processor to transform the response.
 * 
 * @template Input - Zod schema type for input validation
 * @template OutputProcessor - Function type that processes the response
 * @template InputType - Inferred input type from the Zod schema
 * @template ReturnType - Inferred return type from the output processor
 * 
 * @param {string} path - The URL or path for the HTTP request
 * @param {ClientMethodOptions<Input>} options - Configuration options for the client method
 * @param {HttpMethod} options.method - HTTP method to use (get, post, put, delete, patch)
 * @param {Input} [options.inputSchema] - Optional Zod schema for input validation
 * @param {string[]} [options.acceptedTypes] - Optional array of accepted content types
 * @param {OutputProcessor} outputProcessor - Function to process the response (e.g., response => response.json())
 * 
 * @returns {Function} A function that accepts input and makes the HTTP request, returning the processed result
 * 
 * @example
 * ```typescript
 * const loginSchema = z.object({ username: z.string(), password: z.string() });
 * const login = createClientMethod(
 *   '/api/login',
 *   { method: 'post', inputSchema: loginSchema },
 *   async (response) => response.json()
 * );
 * 
 * const result = await login({ username: 'user', password: 'pass' });
 * ```
 */
export function createClientMethod<
  Input extends z.ZodTypeAny | undefined,
  OutputProcessor extends (response: Response) => unknown,
  InputType = FunctionSchema<Input>,
  ReturnType = OutputProcessorReturnType<OutputProcessor>
>(
  path: string,
  options: ClientMethodOptions<Input>,
  outputProcessor: OutputProcessor
): (input: InputType, init?: RequestInit) => Promise<ReturnType>;

/**
 * Creates a type-safe HTTP client method with input validation.
 * This overload returns the raw Response object without processing.
 * 
 * @template Input - Zod schema type for input validation
 * @template InputType - Inferred input type from the Zod schema
 * 
 * @param {string} path - The URL or path for the HTTP request
 * @param {ClientMethodOptions<Input>} options - Configuration options for the client method
 * @param {HttpMethod} options.method - HTTP method to use (get, post, put, delete, patch)
 * @param {Input} [options.inputSchema] - Optional Zod schema for input validation
 * @param {string[]} [options.acceptedTypes] - Optional array of accepted content types
 * 
 * @returns {Function} A function that accepts input and makes the HTTP request, returning the raw Response
 * 
 * @example
 * ```typescript
 * const updateSchema = z.object({ id: z.number(), status: z.string() });
 * const updateStatus = createClientMethod(
 *   '/api/status',
 *   { method: 'put', inputSchema: updateSchema }
 * );
 * 
 * const response = await updateStatus({ id: 123, status: 'active' });
 * const data = await response.json();
 * ```
 */
export function createClientMethod<
  Input extends z.ZodTypeAny,
  InputType = FunctionSchema<Input>
>(
  path: string,
  options: ClientMethodOptions<Input>
): (input: InputType, init?: RequestInit) => Promise<Response>;

/**
 * Implementation of createClientMethod that creates a type-safe HTTP client method.
 * 
 * @internal
 * This function validates input using the provided Zod schema, makes an HTTP request,
 * handles errors by throwing HttpError on non-OK responses, and optionally processes
 * the response using the provided output processor.
 * 
 * @throws {HttpError} When the response is not OK (status code outside 200-299 range)
 * @throws {z.ZodError} When input validation fails against the provided schema
 */
export function createClientMethod<
  Input extends z.ZodTypeAny,
  OutputProcessor extends ((response: Response) => unknown) | undefined = undefined,
  InputType = FunctionSchema<Input>,
  ReturnType = OutputProcessor extends undefined
    ? Response
    : OutputProcessorReturnType<OutputProcessor>
>(
  path: string,
  options: ClientMethodOptions<Input>,
  outputProcessor?: OutputProcessor
): (input: InputType, init?: RequestInit) => Promise<ReturnType> {
  return (input: InputType, init: RequestInit = {}) => {
    const { headers: customHeaders, ...restInit } = init;
    return fetch(path, {
      method: options.method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      body: options.inputSchema ? JSON.stringify(options.inputSchema.parse(input)) : undefined,
      ...restInit,
    }).then(response => {
      if (!response.ok) {
        throw HttpError.fromResponse(response);
      }
  
      if (outputProcessor) {
        return outputProcessor(response) as ReturnType;
      }
  
      return response as ReturnType;
    });
  }
}
