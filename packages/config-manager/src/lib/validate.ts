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
  let changed = false;
  for (const key of Object.keys(defaults)) {
    if (!(key in data)) {
      data[key] = defaults[key];
      changed = true;
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

  if (changed) {
    writeConfigFile(filePath, result.data as Record<string, unknown>);
  }

  return result.data as Record<string, unknown>;
}
