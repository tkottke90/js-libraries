

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

  toJSON() {
    return ({
      ...this.metadata,
      name: this.name,
      message: this.message,
      stack: this.stack ?? '',
      cause: this.cause ?? 'Unknown Cause'
    })
  }
}