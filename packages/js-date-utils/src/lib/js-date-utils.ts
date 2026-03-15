const durationFormat = new Intl.RelativeTimeFormat('en', {
  style: 'long',
  numeric: 'always'
});

const ONE_MINUTE =
  1000 * // ms
  60; // sec

const ONE_HOUR = ONE_MINUTE * 60;

const ONE_DAY = ONE_HOUR * 24;

/**
 * Formats a timestamp relative to today.  If the timestamp is from today,
 * it will format only the time (e.g. "3:45 PM").  If the timestamp is
 * from a different day, it will format the full date and time (e.g. "9/15/2023, 3:45 PM").
 * @param timestamp The timestamp to format.
 * @returns A formatted string representing the timestamp.
 */
export function formatTimestamp(timestamp: Date): string {
  const now = new Date();

  const isToday = timestamp.toDateString() === now.toDateString();

  if (isToday) {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return timestamp.toLocaleString();
}

/**
 * Format a duration given a start and end time in milliseconds.
 *   - If the durationis less than 1 second, it will format in milliseconds (e.g. "500ms").
 *   - If the duration is greater than or equal to 1 second, it will format in hours, minutes, and seconds (e.g. "1h 30m 45s").
 * @param start The start date when the duration began.
 * @param end The end date when the duration ended.
 * @returns A formatted string representing the duration between the start and end times.
 */
export function formatDuration(start: Date, end: Date): string {
  const startMs = start.valueOf();
  const endMs = end.valueOf();

  const durationParts = { h: 0, m: 0, s: 0 };

  const ms = endMs - startMs;
  if (ms < 1000) return `${ms}ms`;

  durationParts.s = Math.floor(ms / 1000);
  durationParts.m = Math.floor(durationParts.s / 60);
  durationParts.s = durationParts.s % 60;
  durationParts.h = Math.floor(durationParts.m / 60);
  durationParts.m = durationParts.m % 60;

  const parts: string[] = [];
  if (durationParts.h > 0) parts.push(`${durationParts.h}h`);
  if (durationParts.m > 0) parts.push(`${durationParts.m}m`);
  if (durationParts.s > 0 || parts.length === 0) parts.push(`${durationParts.s}s`);

  return parts.join(' ');
}

/**
 * Generates a relative date format for the given date using the 
 * Intl library. If the date is in the past, it will return a string like "5 minutes ago".
 * If the date is in the future, it will return a string like "in 5 minutes".
 * @param date 
 * @returns 
 */
export function generateRelativeDateFormat(date: Date) {
  const now = Date.now();
  const inputValue = date.valueOf();

  const diff = inputValue - now;
  const diffABS = Math.abs(diff);

  switch (true) {
    case diffABS < ONE_MINUTE:
      return durationFormat.format(Math.round(diff / 1000), 'seconds');
    case diffABS > ONE_MINUTE && diffABS < ONE_HOUR:
      return durationFormat.format(Math.round(diff / ONE_MINUTE), 'minutes');
    case diffABS > ONE_HOUR && diffABS < ONE_DAY:
      return durationFormat.format(Math.round(diff / ONE_HOUR), 'hours');
    case diffABS > ONE_DAY:
      return durationFormat.format(Math.round(diff / ONE_DAY), 'days');
    default:
      return '-';
  }
}