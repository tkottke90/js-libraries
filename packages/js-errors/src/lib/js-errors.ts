/**
 * The BaseError class extends the Javascript error class and
 * and provides some useful methods for working with errors that
 * are not standardized or available in the current Error class.
 */
export class BaseError extends Error {
  override name = 'BaseError';

  constructor(message: string, public metadata: Record<string, unknown> = {}) {
    super(message);
  }

  /**
   * Custom toString method for errors which ensures that all information about
   * the error is provided in a clear and standardized format.
   * @returns A string representation of the error
   *
   * @example
   * const error = new BaseError('Database connection failed', {
   *   host: 'localhost',
   *   port: 5432,
   *   retries: 3
   * });
   * console.log(error.toString());
   * // Output: "BaseError (message: Database connection failed host:localhost port:5432 retries:3)"
   */
  override toString() {
    const metadataStr = Array.from(Object.entries(this.metadata))
      .map(([key, value]) => {
        return `${key}:${value}`;
      })
      .join(' ');

    return `${this.name} (message: ${this.message} ${metadataStr})`;
  }

  /**
   * Converts the Error to a serializable JSON Object and backfills
   * any empty or missing fields
   * @returns A JSON object representation of the error
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON(): Record<string, any> {
    return {
      ...this.metadata,
      name: this.name,
      message: this.message,
      stack: this.stack ?? '',
      cause: this.cause ?? 'Unknown Cause',
    };
  }

  /**
   * Catch values in Javascript/Typescript are typed as `unknown`. This
   * method is designed to build that unknown into a BaseError to make
   * handling the errors easier with a standardized syntax
   * @param error Error received from the catch block
   * @returns new BaseError instance
   */
  static fromCatch(error: any) {
    if (error instanceof BaseError) {
      return error;
    }

    // Try and extract the message from the input error
    const message = 'message' in error ? error.message : JSON.stringify(error);

    // Create metadata from the error properties
    const metadata = Array.from(Object.entries(error)).reduce(
      (output, [key, value]) => {
        return {
          ...output,
          [key]: value,
        };
      },
      {}
    );

    return new BaseError(message, metadata);
  }
}
