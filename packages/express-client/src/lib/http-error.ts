import { BaseError } from '@tkottke90/js-errors';

/**
 * Enhanced error class specifically for HTTP errors
 */
export class HttpError extends BaseError {
  override name = 'HttpError';

  constructor(
    readonly status: number,
    readonly statusMessage: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, metadata);
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      status: this.status,
      statusMessage: this.statusMessage,
    };
  }

  static fromResponse(response: Response) {
    return new HttpError(
      response.status,
      response.statusText,
      `HTTP Error: ${response.status} ${response.statusText}`
    );
  }
}