import isEqual from 'lodash/isEqual.js';
import merge from 'lodash/merge.js';
import type { ZodIssue, ZodTypeAny } from 'zod';
import { writeConfigFile } from './format.js';

export function formatZodErrors(issues: ZodIssue[]): string {
  const lines = issues.map((issue) => {
    const key = issue.path.join('.');
    return `[${key}]: ${issue.message}`;
  });
  return `Config Errors:\n===========\n${lines.join('\n')}`;
}

export function validateAndMigrate(
  data: Record<string, unknown>,
  schema: ZodTypeAny,
  filePath: string
): Record<string, unknown> {
  const defaults = schema.parse({}) as Record<string, unknown>;

  // Fill any missing top-level keys from defaults
  for (const key of Object.keys(defaults)) {
    if (!(key in data)) {
      data[key] = defaults[key];
    }
  }

  const result = schema.safeParse(data);

  if (!result.success) {
    console.error(formatZodErrors(result.error.issues));

    // Attempt recovery: deep-merge defaults on top of data (defaults win for type conflicts)
    let recovered: Record<string, unknown>;
    try {
      const merged = merge({}, data, defaults) as Record<string, unknown>;
      recovered = schema.parse(merged) as Record<string, unknown>;
    } catch {
      // If merge still can't produce a valid result, fall back to pure defaults
      recovered = defaults;
    }
    writeConfigFile(filePath, recovered);
    return recovered;
  }

  const validated = result.data as Record<string, unknown>;

  // Write back if the validated output differs from the input — this catches nested
  // Zod-injected defaults (e.g. new fields added inside an existing object) in addition
  // to the top-level missing-key case handled above.
  if (!isEqual(data, validated)) {
    writeConfigFile(filePath, validated);
  }

  return validated;
}
