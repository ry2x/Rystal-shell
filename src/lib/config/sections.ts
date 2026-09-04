import {DEFAULT_CONFIG} from './defaults.ts';
import {
  isConfigObject,
  readNonBlankString,
  readOptionalString,
  readSection,
  readString,
  warnConfig,
  warnUnknownKeys,
} from './reader.ts';
import type {AppConfig, ConfigObject, WorldClockConfig} from './types';

function defaultWorldClocks() {
  return DEFAULT_CONFIG.worldClocks.map(clock => ({...clock}));
}

function isValidTimeZone(timeZone: string) {
  if (timeZone.trim().length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', {timeZone}).format(0);
    return true;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function resolveWorldClocks(value: unknown): WorldClockConfig[] {
  if (value === undefined) return defaultWorldClocks();
  if (!Array.isArray(value)) {
    warnConfig('worldClocks', 'expected an array');
    return defaultWorldClocks();
  }

  const clocks = value.flatMap((entry, index) => {
    if (!isConfigObject(entry)) {
      warnConfig(`worldClocks[${index}]`, 'expected an object');
      return [];
    }
    warnUnknownKeys(`worldClocks[${index}]`, entry, ['label', 'tz']);
    if (typeof entry.label !== 'string' || typeof entry.tz !== 'string') {
      warnConfig(`worldClocks[${index}]`, "expected string properties 'label' and 'tz'");
      return [];
    }
    if (!isValidTimeZone(entry.tz)) {
      warnConfig(`worldClocks[${index}].tz`, 'expected a valid IANA time zone');
      return [];
    }
    return [{label: entry.label, tz: entry.tz}];
  });

  return value.length > 0 && clocks.length === 0 ? defaultWorldClocks() : clocks;
}

function resolveBrightness(root: ConfigObject): AppConfig['brightness'] {
  const section = readSection(root, 'brightness');
  if (section) warnUnknownKeys('brightness', section, ['backend']);
  const backend = section?.backend;
  if (backend === 'auto' || backend === 'ddcutil' || backend === 'brightnessctl') {
    return {backend};
  }
  if (backend !== undefined) {
    warnConfig('brightness.backend', "expected 'auto', 'ddcutil', or 'brightnessctl'");
  }
  return {...DEFAULT_CONFIG.brightness};
}

function resolveUi(root: ConfigObject): AppConfig['ui'] {
  const section = readSection(root, 'ui');
  if (section) warnUnknownKeys('ui', section, ['scale']);
  const scale = section?.scale;
  if (scale === 0.75 || scale === 1 || scale === 1.25 || scale === 1.5 || scale === 2) {
    return {scale};
  }
  if (scale !== undefined) {
    warnConfig('ui.scale', 'expected 0.75, 1, 1.25, 1.5, or 2');
  }
  return {...DEFAULT_CONFIG.ui};
}

function resolveWeather(root: ConfigObject): AppConfig['weather'] {
  const section = readSection(root, 'weather');
  if (section) warnUnknownKeys('weather', section, ['location']);
  return {
    location: readString(section, 'location', 'weather', DEFAULT_CONFIG.weather.location),
  };
}

function resolveNotifications(root: ConfigObject): AppConfig['notifications'] {
  const section = readSection(root, 'notifications');
  if (section) warnUnknownKeys('notifications', section, ['maxCount']);
  const maxCount = section?.maxCount;
  if (typeof maxCount === 'number' && Number.isInteger(maxCount) && maxCount > 0) {
    return {maxCount};
  }
  if (maxCount !== undefined) {
    warnConfig('notifications.maxCount', 'expected a positive integer');
  }
  return {...DEFAULT_CONFIG.notifications};
}

function resolveRecorder(root: ConfigObject): AppConfig['recorder'] {
  const section = readSection(root, 'recorder');
  if (section) {
    warnUnknownKeys('recorder', section, [
      'savePath',
      'filenameFormat',
      'recordAudio',
      'audioSource',
    ]);
  }

  const recordAudio = section?.recordAudio;
  const audioSource = section?.audioSource;
  if (recordAudio !== undefined && typeof recordAudio !== 'boolean') {
    warnConfig('recorder.recordAudio', 'expected a boolean');
  }
  if (audioSource !== undefined && audioSource !== 'system' && audioSource !== 'mic') {
    warnConfig('recorder.audioSource', "expected 'system' or 'mic'");
  }

  return {
    savePath: readNonBlankString(section, 'savePath', 'recorder', DEFAULT_CONFIG.recorder.savePath),
    filenameFormat: readNonBlankString(
      section,
      'filenameFormat',
      'recorder',
      DEFAULT_CONFIG.recorder.filenameFormat
    ),
    recordAudio:
      typeof recordAudio === 'boolean' ? recordAudio : DEFAULT_CONFIG.recorder.recordAudio,
    audioSource:
      audioSource === 'system' || audioSource === 'mic'
        ? audioSource
        : DEFAULT_CONFIG.recorder.audioSource,
  };
}

function resolveProfile(root: ConfigObject): AppConfig['profile'] {
  const section = readSection(root, 'profile');
  if (section) warnUnknownKeys('profile', section, ['avatarPath', 'handle', 'os']);
  return {
    avatarPath: readString(section, 'avatarPath', 'profile', DEFAULT_CONFIG.profile.avatarPath),
    handle: readOptionalString(section, 'handle', 'profile'),
    os: readOptionalString(section, 'os', 'profile'),
  };
}

export function resolveSections(root: ConfigObject): AppConfig {
  return {
    ui: resolveUi(root),
    brightness: resolveBrightness(root),
    weather: resolveWeather(root),
    notifications: resolveNotifications(root),
    worldClocks: resolveWorldClocks(root.worldClocks),
    recorder: resolveRecorder(root),
    profile: resolveProfile(root),
  };
}
