import type {ConfigObject} from './types';

export function isConfigObject(value: unknown): value is ConfigObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function warnConfig(path: string, message: string) {
  console.warn(`Invalid config at '${path}': ${message}`);
}

export function warnUnknownKeys(path: string, value: ConfigObject, allowedKeys: readonly string[]) {
  const allowed = new Set(allowedKeys);
  Object.keys(value)
    .filter(key => !allowed.has(key))
    .forEach(key => console.warn(`Unknown config key '${path}.${key}'`));
}

export function readSection(root: ConfigObject, key: string): ConfigObject | undefined {
  const value = root[key];
  if (value === undefined) return undefined;
  if (isConfigObject(value)) return value;
  warnConfig(key, 'expected an object');
  return undefined;
}

export function readString(
  section: ConfigObject | undefined,
  key: string,
  path: string,
  fallback: string
) {
  const value = section?.[key];
  if (value === undefined) return fallback;
  if (typeof value === 'string') return value;
  warnConfig(`${path}.${key}`, 'expected a string');
  return fallback;
}

export function readNonBlankString(
  section: ConfigObject | undefined,
  key: string,
  path: string,
  fallback: string
) {
  const value = section?.[key];
  if (value === undefined) return fallback;
  if (typeof value === 'string' && value.trim().length > 0) return value;
  warnConfig(`${path}.${key}`, 'expected a non-empty string');
  return fallback;
}

export function readOptionalString(section: ConfigObject | undefined, key: string, path: string) {
  const value = section?.[key];
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  warnConfig(`${path}.${key}`, 'expected a string');
  return undefined;
}
