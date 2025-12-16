

export class BaseError extends Error {

  override name = 'BaseError';

  constructor(message: string, public metadata: Record<string, unknown> = {}) {
    super(message);
  }

  override toString() {
    const metadataStr = Array.from(Object.entries(this.metadata)).map(([key, value]) => {
      return `${key}:${value}`
    }).join(' ');

    return `${this.name} (message: ${this.message}) ${metadataStr}`;
  }

  toJSON(): Record<string, any> {
    return ({
      ...this.metadata,
      name: this.name,
      message: this.message,
      stack: this.stack ?? '',
      cause: this.cause ?? 'Unknown Cause'
    })
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
    const metadata = Array.from(Object.entries(error)).reduce((output, [key, value]) => {
      return ({
        ...output,
        [key]: value
      })
    }, {});

    return new BaseError(
      message,
      metadata
    )
  }
}