import {isConfigObject, warnConfig, warnUnknownKeys} from './reader.ts';
import {resolveSections} from './sections.ts';
import type {AppConfig} from './types';

export function resolveConfig(value: unknown): AppConfig {
  if (!isConfigObject(value)) {
    warnConfig('root', 'expected an object');
    return resolveConfig({});
  }

  warnUnknownKeys('root', value, [
    'ui',
    'brightness',
    'weather',
    'notifications',
    'worldClocks',
    'recorder',
    'profile',
  ]);

  return resolveSections(value);
}
