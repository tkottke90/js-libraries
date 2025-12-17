# JS Errors

Javascript Errors to me seem like an after-thought or under developed portion of the language. A common issue I saw with Typescript specifically was that the error in a `try-catch` block was typed as `unknown`.

This library looks to enhance the Error class by providing a standardized interface and helper methods for dealing with errors.

## Usage

This library exposes utility classes for working with errors and providing a more standard interface for those errors. You can create your own errors by simply extending the base class.

```ts
import { BaseError } from '@tkottke90/js-errors';

class AuthorizationError extends BaseError {
  override name = 'AuthorizationError';
}
```

You can then use that error as you would normally with any Javascript Error:

```ts
function authorize(user?: User) {
  if (!user) {
    throw new AuthorizationError('User not authorized');
  }

  return user;
}
```

### Catching Errors

One of the biggest challenges with Typescript and the `try-catch` block is that the error value is typed as `unknown`. While this type is similiarly flexable to `any`, it requires that we assert a type for every catch block.

> TS Docs: https://www.typescriptlang.org/docs/handbook/type-compatibility.html#any-unknown-object-void-undefined-null-and-never-assignability
>
> `any` and `unknown` are the same in terms of what is assignable to them, different in that `unknown` is not assignable to anything except `any`.

To help with this type assertion, the `BaseError` has a `fromCatch` method. Inpsired by the `Array.from` method, this method takes in that unknown value, checks if it is an instance of the `BaseError` Class, or converts it to one if it is not. This provides you a standard interface for dealing with errors in catch blocks:

```ts
// Traditional error was thrown
try {
  throw new Error('Bad Request');
} catch (e: unknown) {
  const error = BaseError.fromCatch(e);

  console.log(error);
}

// Output:
// BaseError (message: Bad Request)
// --------------------------------

// Converting a primitive value into a BaseError
try {
  throw 'this is just a string';
} catch (e: unknown) {
  const error = BaseError.fromCatch(e);

  console.log(error);
}

// Output:
// BaseError (message: this is just a string)
// --------------------------------

// Skipping the conversion when the error already extends the BaseError class
try {
  authorize(undefined);
} catch (e: unknown) {
  const error = BaseError.fromCatch(e);

  console.log(error);
}

// Output:
// AuthorizationError (message: User not authorized)
```

## BaseError Class Reference

The `BaseError` class is the foundation of this library. It extends the native JavaScript `Error` class and provides additional functionality for standardized error handling.

### Constructor

```ts
constructor(message: string, metadata?: Record<string, unknown>)
```

Creates a new `BaseError` instance with a message and optional metadata.

**Parameters:**

- `message` (string): The error message
- `metadata` (Record<string, unknown>, optional): Additional context about the error. Defaults to an empty object.

**Example:**

```ts
const error = new BaseError('Database connection failed', {
  host: 'localhost',
  port: 5432,
  retries: 3,
});
```

### Properties

#### `name`

- **Type:** `string`
- **Default:** `'BaseError'`
- **Description:** The name of the error class. Override this property when extending `BaseError` to create custom error types.

#### `message`

- **Type:** `string`
- **Description:** The error message (inherited from native Error class)

#### `metadata`

- **Type:** `Record<string, unknown>`
- **Description:** Additional context and information about the error. This is useful for logging, debugging, and error handling.

#### `stack`

- **Type:** `string | undefined`
- **Description:** The stack trace (inherited from native Error class)

### Methods

#### `toString(): string`

Returns a formatted string representation of the error including the error name, message, and all metadata.

**Returns:** A string representation of the error

**Example:**

```ts
const error = new BaseError('Database connection failed', {
  host: 'localhost',
  port: 5432,
  retries: 3,
});

console.log(error.toString());
// Output: "BaseError (message: Database connection failed host:localhost port:5432 retries:3)"
```

#### `toJSON(): Record<string, any>`

Converts the error to a serializable JSON object. This is useful for logging errors to external services or storing them in databases.

**Returns:** A JSON object containing all metadata, error name, message, stack trace, and cause

**Example:**

```ts
const error = new BaseError('API request failed', {
  statusCode: 500,
  endpoint: '/api/users',
});

console.log(JSON.stringify(error.toJSON(), null, 2));
// Output:
// {
//   "statusCode": 500,
//   "endpoint": "/api/users",
//   "name": "BaseError",
//   "message": "API request failed",
//   "stack": "Error: API request failed\n    at ...",
//   "cause": "Unknown Cause"
// }
```

#### `static fromCatch(error: unknown): BaseError`

Converts an unknown caught value into a `BaseError` instance. If the value is already a `BaseError`, it returns it unchanged. Otherwise, it extracts the message and properties to create a new `BaseError`.

**Parameters:**

- `error` (unknown): The caught error value

**Returns:** A `BaseError` instance

**Example:**

```ts
try {
  // Some operation that might fail
  throw new Error('Something went wrong');
} catch (e: unknown) {
  const error = BaseError.fromCatch(e);
  console.log(error.toString());
  // Output: "BaseError (message: Something went wrong)"
}
```

### Extending BaseError

You can create custom error classes by extending `BaseError`. This allows you to create domain-specific error types with consistent behavior.

**Basic Extension:**

```ts
import { BaseError } from '@tkottke90/js-errors';

class DatabaseError extends BaseError {
  override name = 'DatabaseError';
}

// Usage
throw new DatabaseError('Connection timeout', {
  host: 'db.example.com',
  port: 5432,
});
```

**Extension with Custom Constructor:**

```ts
class ValidationError extends BaseError {
  override name = 'ValidationError';

  constructor(message: string, public field: string, public value: unknown) {
    super(message, { field, value });
  }
}

// Usage
throw new ValidationError('Invalid email format', 'email', 'not-an-email');
```

**Extension with Custom Methods:**

```ts
class APIError extends BaseError {
  override name = 'APIError';

  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message, { statusCode, endpoint });
  }

  isRetryable(): boolean {
    return this.statusCode >= 500 || this.statusCode === 429;
  }

  getRetryDelay(): number {
    if (this.statusCode === 429) return 60000; // 1 minute
    return 5000; // 5 seconds
  }
}

// Usage
try {
  // API call
} catch (e: unknown) {
  const error = BaseError.fromCatch(e) as APIError;

  if (error.isRetryable()) {
    setTimeout(() => {
      // Retry logic
    }, error.getRetryDelay());
  }
}
```

### Best Practices

1. **Always override the `name` property** when creating custom error classes for better error identification
2. **Use metadata for context** - Include relevant information that will help with debugging and logging
3. **Use `fromCatch` in catch blocks** - This ensures consistent error handling across your application
4. **Serialize errors with `toJSON`** - Use this when logging errors to external services
5. **Create domain-specific errors** - Extend `BaseError` for different error scenarios in your application

## Building

Run `nx build js-errors` to build the library.

## Running unit tests

Run `nx test js-errors` to execute the unit tests via [Vitest](https://vitest.dev/).
