/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';
import { formatDuration, formatTimestamp, generateRelativeDateFormat } from './js-date-utils.js';

describe('formatTimestamp', () => {
  let RealDate: typeof Date;
  const mockNow = new Date('2026-03-15T12:00:00');

  beforeEach(() => {
    // Store original Date
    RealDate = global.Date;

    // Mock Date constructor to return our mocked date when called without arguments
    const MockDate = class extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockNow.valueOf());
        } else {
          // Pass all arguments to the real Date constructor
          super(...(args as [any]));
        }
      }
      
      static override now() {
        return mockNow.valueOf();
      }
    };

    // Copy static methods
    Object.setPrototypeOf(MockDate, RealDate);
    Object.getOwnPropertyNames(RealDate).forEach(name => {
      if (name !== 'length' && name !== 'prototype' && name !== 'name') {
        try {
          (MockDate as any)[name] = (RealDate as any)[name];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // Ignore errors for non-configurable properties
        }
      }
    });

    global.Date = MockDate as any;
  });

  afterEach(() => {
    // Restore original Date
    global.Date = RealDate;
  });

  test('should format today\'s timestamp as time only', () => {
    const today = new Date(2026, 2, 15, 15, 45, 0); // March 15, 2026 at 3:45 PM local time
    const result = formatTimestamp(today);
    // Should only contain time, not full date
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    expect(result).not.toContain('/');
  });

  test('should format yesterday\'s timestamp as full date and time', () => {
    const yesterday = new Date(2026, 2, 14, 15, 45, 0); // March 14, 2026 at 3:45 PM local time
    const result = formatTimestamp(yesterday);
    // Should contain full date with slashes or dashes
    expect(result).toMatch(/[\d/,-]/);
    // Different from time-only format
    expect(result.length).toBeGreaterThan(10);
  });

  test('should format tomorrow\'s timestamp as full date and time', () => {
    const tomorrow = new Date(2026, 2, 16, 10, 30, 0); // March 16, 2026 at 10:30 AM local time
    const result = formatTimestamp(tomorrow);
    // Should contain full date with slashes or dashes
    expect(result).toMatch(/[\d/,-]/);
    expect(result.length).toBeGreaterThan(10);
  });

  test('should format today at midnight as time only', () => {
    const midnight = new Date(2026, 2, 15, 0, 0, 0); // March 15, 2026 at midnight local time
    const result = formatTimestamp(midnight);
    // Should only contain time format
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    expect(result).not.toContain('/');
  });

  test('should format today at end of day as time only', () => {
    const endOfDay = new Date(2026, 2, 15, 23, 59, 0); // March 15, 2026 at 11:59 PM local time
    const result = formatTimestamp(endOfDay);
    // Should only contain time format
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    expect(result).not.toContain('/');
  });

  test('should format old dates with full date and time', () => {
    const oldDate = new Date(2020, 0, 15, 10, 30, 0); // January 15, 2020 at 10:30 AM local time
    const result = formatTimestamp(oldDate);
    // Should be full format with year
    expect(result).toMatch(/2020/);
    expect(result.length).toBeGreaterThan(10);
  });

  test('should format future dates with full date and time', () => {
    const futureDate = new Date(2027, 11, 25, 14, 0, 0); // December 25, 2027 at 2:00 PM local time
    const result = formatTimestamp(futureDate);
    // Should be full format with year
    expect(result).toMatch(/2027/);
    expect(result.length).toBeGreaterThan(10);
  });
});

describe('formatDuration', () => {
  // HIGH PRIORITY TESTS - Core Functionality

  test('should format duration less than 1 second as milliseconds', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:00:00.500Z');
    expect(formatDuration(start, end)).toBe('500ms');
  });

  test('should format exactly 1 second', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:00:01.000Z');
    expect(formatDuration(start, end)).toBe('1s');
  });

  test('should format duration with only seconds', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:00:45.000Z');
    expect(formatDuration(start, end)).toBe('45s');
  });

  test('should format duration with minutes and seconds', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:05:30.000Z');
    expect(formatDuration(start, end)).toBe('5m 30s');
  });

  test('should format duration with hours, minutes and seconds', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T13:30:45.000Z');
    expect(formatDuration(start, end)).toBe('1h 30m 45s');
  });

  test('should format duration with only minutes (no seconds)', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:05:00.000Z');
    expect(formatDuration(start, end)).toBe('5m');
  });

  test('should format duration with hours and minutes (no seconds)', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T14:30:00.000Z');
    expect(formatDuration(start, end)).toBe('2h 30m');
  });

  // MEDIUM PRIORITY TESTS - Edge Cases

  test('should format zero duration', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:00:00.000Z');
    expect(formatDuration(start, end)).toBe('0ms');
  });

  test('should format exactly 1 minute', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:01:00.000Z');
    expect(formatDuration(start, end)).toBe('1m');
  });

  test('should format exactly 1 hour', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T13:00:00.000Z');
    expect(formatDuration(start, end)).toBe('1h');
  });

  test('should format large duration correctly', () => {
    const start = new Date('2023-01-01T08:00:00.000Z');
    const end = new Date('2023-01-01T23:45:30.000Z');
    expect(formatDuration(start, end)).toBe('15h 45m 30s');
  });

  test('should format duration spanning multiple days', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-02T14:30:15.000Z');
    // 26 hours, 30 minutes, 15 seconds
    expect(formatDuration(start, end)).toBe('26h 30m 15s');
  });

  // LOW PRIORITY TESTS - Boundary Conditions

  test('should format 999ms as milliseconds', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:00:00.999Z');
    expect(formatDuration(start, end)).toBe('999ms');
  });

  test('should format 1000ms as 1 second', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:00:01.000Z');
    expect(formatDuration(start, end)).toBe('1s');
  });

  test('should handle negative duration when end is before start', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T11:00:00.000Z');
    const result = formatDuration(start, end);
    // Current implementation returns negative milliseconds
    expect(result).toBe('-3600000ms');
  });

  // ADDITIONAL TESTS - Edge Cases for Conditional Logic

  test('should format duration with hours and seconds (no minutes)', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T14:00:30.000Z');
    expect(formatDuration(start, end)).toBe('2h 30s');
  });

  test('should format 59 seconds', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:00:59.000Z');
    expect(formatDuration(start, end)).toBe('59s');
  });

  test('should format 1 millisecond', () => {
    const start = new Date('2023-01-01T12:00:00.000Z');
    const end = new Date('2023-01-01T12:00:00.001Z');
    expect(formatDuration(start, end)).toBe('1ms');
  });
});

describe('generateRelativeDateFormat', () => {
  let originalDateNow: () => number;

  beforeEach(() => {
    // Store the original Date.now function
    originalDateNow = Date.now;

    // Mock Date.now to return a fixed timestamp for consistent testing
    const mockNow = new Date('2023-01-01T12:00:00Z').valueOf();
    Date.now = vi.fn(() => mockNow);
  });

  afterEach(() => {
    // Restore the original Date.now function after each test
    Date.now = originalDateNow;
  });

  test('should format seconds correctly', () => {
    // 30 seconds in the future
    const futureDate = new Date(Date.now() + 30 * 1000);
    expect(generateRelativeDateFormat(futureDate)).toBe('in 30 seconds');

    // 30 seconds in the past
    const pastDate = new Date(Date.now() - 30 * 1000);
    expect(generateRelativeDateFormat(pastDate)).toBe('30 seconds ago');
  });

  test('should format minutes correctly', () => {
    // 5 minutes in the future
    const futureDate = new Date(Date.now() + 5 * 60 * 1000);
    expect(generateRelativeDateFormat(futureDate)).toBe('in 5 minutes');

    // 5 minutes in the past
    const pastDate = new Date(Date.now() - 5 * 60 * 1000);
    expect(generateRelativeDateFormat(pastDate)).toBe('5 minutes ago');
  });

  test('should format hours correctly', () => {
    // 3 hours in the future
    const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
    expect(generateRelativeDateFormat(futureDate)).toBe('in 3 hours');

    // 3 hours in the past
    const pastDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(generateRelativeDateFormat(pastDate)).toBe('3 hours ago');
  });

  test('should format days correctly', () => {
    // 2 days in the future
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    expect(generateRelativeDateFormat(futureDate)).toBe('in 2 days');

    // 2 days in the past
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(generateRelativeDateFormat(pastDate)).toBe('2 days ago');
  });
});
