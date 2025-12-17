import { BaseError } from '@tkottke90/js-errors';

export class InvalidGrafanaConfig extends BaseError {
  override name = 'InvalidGrafanaConfig';
}
