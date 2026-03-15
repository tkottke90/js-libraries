# js-date-utils

A utility library for formatting dates, timestamps, and durations in JavaScript applications.

## Installation

### Install from npm

```bash
npm install @tkottke90/js-date-utils
```

### Install from GitHub Release

Download the tarball from the [GitHub Releases](https://github.com/tkottke90/js-helper-packages/releases) page and install it locally:

```bash
npm install /path/to/tkottke90-js-date-utils.tgz
```

Or install directly from a release URL:

```bash
npm install https://github.com/tkottke90/js-helper-packages/releases/download/[tag]/tkottke90-js-date-utils.tgz
```

## Usage

Import the functions you need from the library:

```typescript
import { formatTimestamp, formatDuration, generateRelativeDateFormat } from '@tkottke90/js-date-utils';
```

## API Reference

### `formatTimestamp(timestamp: Date): string`

Formats a timestamp relative to today. If the timestamp is from today, it will format only the time. If the timestamp is from a different day, it will format the full date and time.

**Parameters:**
- `timestamp` (Date): The timestamp to format

**Returns:**
- A formatted string representing the timestamp

**Examples:**

```typescript
// Today at 3:45 PM
const todayTimestamp = new Date();
formatTimestamp(todayTimestamp);
// Output: "3:45 PM"

// Different day
const pastDate = new Date('2024-09-15T15:45:00');
formatTimestamp(pastDate);
// Output: "9/15/2024, 3:45 PM"
```

### `formatDuration(start: Date, end: Date): string`

Formats a duration between two dates. If the duration is less than 1 second, it formats in milliseconds. If the duration is greater than or equal to 1 second, it formats in hours, minutes, and seconds.

**Parameters:**
- `start` (Date): The start date when the duration began
- `end` (Date): The end date when the duration ended

**Returns:**
- A formatted string representing the duration between the start and end times

**Examples:**

```typescript
const start = new Date('2024-03-15T10:00:00');
const end = new Date('2024-03-15T11:35:45');

formatDuration(start, end);
// Output: "1h 35m 45s"

// Short duration
const shortStart = new Date('2024-03-15T10:00:00.000');
const shortEnd = new Date('2024-03-15T10:00:00.500');
formatDuration(shortStart, shortEnd);
// Output: "500ms"

// Minutes and seconds only
const mediumStart = new Date('2024-03-15T10:00:00');
const mediumEnd = new Date('2024-03-15T10:05:30');
formatDuration(mediumStart, mediumEnd);
// Output: "5m 30s"
```

### `generateRelativeDateFormat(date: Date): string`

Generates a relative date format for the given date using the Intl library. If the date is in the past, it returns a string like "5 minutes ago". If the date is in the future, it returns a string like "in 5 minutes".

**Parameters:**
- `date` (Date): The date to format relative to now

**Returns:**
- A formatted string representing the relative time

**Examples:**

```typescript
// 5 minutes ago
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
generateRelativeDateFormat(fiveMinutesAgo);
// Output: "5 minutes ago"

// In 2 hours
const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
generateRelativeDateFormat(twoHoursFromNow);
// Output: "in 2 hours"

// 3 days ago
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
generateRelativeDateFormat(threeDaysAgo);
// Output: "3 days ago"

// 30 seconds ago
const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
generateRelativeDateFormat(thirtySecondsAgo);
// Output: "30 seconds ago"
```

## Development

This library was generated with [Nx](https://nx.dev).

### Building

Run `nx build js-date-utils` to build the library.

### Running unit tests

Run `nx test js-date-utils` to execute the unit tests via [Vitest](https://vitest.dev/).
