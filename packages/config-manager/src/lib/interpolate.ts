const ENV_VAR_PATTERN = /\$\{([A-Z_][A-Z0-9_]*)\}/g;

export function interpolateEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(ENV_VAR_PATTERN, (_, name: string) => {
      const value = process.env[name];
      if (value === undefined) {
        console.warn(
          `[config-manager] interpolation warning: environment variable "${name}" is not set. Substituting empty string.`
        );
        return '';
      }
      return value;
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = interpolateEnvVars(value);
    }
    return result;
  }

  // Numbers, booleans, null, undefined — pass through unchanged
  return obj;
}
