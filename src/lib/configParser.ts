type BrightnessBackendConfig = 'auto' | 'ddcutil' | 'brightnessctl';
type RecorderAudioSource = 'system' | 'mic';
type UiScale = 0.75 | 1 | 1.25 | 1.5 | 2;

interface MonitorUiConfig {
  scale: UiScale;
}

interface UiConfig {
  scale: UiScale;
  monitors: Record<string, MonitorUiConfig>;
}

interface WorldClockConfig {
  label: string;
  tz: string;
}

export interface AppConfig {
  ui: UiConfig;
  brightness: {backend: BrightnessBackendConfig};
  weather: {location: string};
  notifications: {maxCount: number};
  worldClocks: WorldClockConfig[];
  recorder: {
    savePath: string;
    filenameFormat: string;
    recordAudio: boolean;
    audioSource: RecorderAudioSource;
  };
  profile: {
    avatarPath: string;
    handle?: string;
    os?: string;
  };
}

type ConfigObject = Record<string, unknown>;

const DEFAULT_CONFIG: AppConfig = {
  ui: {scale: 1, monitors: {}},
  brightness: {backend: 'auto'},
  weather: {location: ''},
  notifications: {maxCount: 30},
  worldClocks: [
    {label: 'London', tz: 'Europe/London'},
    {label: 'Brisbane', tz: 'Australia/Brisbane'},
    {label: 'New York', tz: 'America/New_York'},
    {label: 'Los Angeles', tz: 'America/Los_Angeles'},
  ],
  recorder: {
    savePath: '~/Videos',
    filenameFormat: 'recording_%Y-%m-%d_%H.%M.%S.mp4',
    recordAudio: true,
    audioSource: 'system',
  },
  profile: {avatarPath: '~/Profile/Profile.png'},
};

function isConfigObject(value: unknown): value is ConfigObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function warnConfig(path: string, message: string) {
  console.warn(`Invalid config at '${path}': ${message}`);
}

function warnUnknownKeys(path: string, value: ConfigObject, allowedKeys: readonly string[]) {
  const allowed = new Set(allowedKeys);
  Object.keys(value)
    .filter(key => !allowed.has(key))
    .forEach(key => console.warn(`Unknown config key '${path}.${key}'`));
}

function readSection(root: ConfigObject, key: string): ConfigObject | undefined {
  const value = root[key];
  if (value === undefined) return undefined;
  if (isConfigObject(value)) return value;
  warnConfig(key, 'expected an object');
  return undefined;
}

function readString(
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

function readNonBlankString(
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

function readOptionalString(section: ConfigObject | undefined, key: string, path: string) {
  const value = section?.[key];
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  warnConfig(`${path}.${key}`, 'expected a string');
  return undefined;
}

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
  if (section) warnUnknownKeys('ui', section, ['scale', 'monitors']);
  const scale = section?.scale;
  const resolvedScale = isUiScale(scale) ? scale : DEFAULT_CONFIG.ui.scale;
  if (scale !== undefined && !isUiScale(scale)) {
    warnConfig('ui.scale', 'expected 0.75, 1, 1.25, 1.5, or 2');
  }

  const monitorsValue = section?.monitors;
  const monitors: Record<string, MonitorUiConfig> = {};
  if (monitorsValue !== undefined && !isConfigObject(monitorsValue)) {
    warnConfig('ui.monitors', 'expected an object');
  } else if (isConfigObject(monitorsValue)) {
    Object.entries(monitorsValue).forEach(([connector, monitorValue]) => {
      const path = `ui.monitors.${connector}`;
      if (connector.length === 0) {
        warnConfig('ui.monitors', 'expected non-empty connector names');
        return;
      }
      if (!isConfigObject(monitorValue)) {
        warnConfig(path, 'expected an object');
        return;
      }
      warnUnknownKeys(path, monitorValue, ['scale']);
      if (!isUiScale(monitorValue.scale)) {
        warnConfig(`${path}.scale`, 'expected 0.75, 1, 1.25, 1.5, or 2');
        return;
      }
      monitors[connector] = {scale: monitorValue.scale};
    });
  }

  return {scale: resolvedScale, monitors};
}

function isUiScale(value: unknown): value is UiScale {
  return value === 0.75 || value === 1 || value === 1.25 || value === 1.5 || value === 2;
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

  return {
    ui: resolveUi(value),
    brightness: resolveBrightness(value),
    weather: resolveWeather(value),
    notifications: resolveNotifications(value),
    worldClocks: resolveWorldClocks(value.worldClocks),
    recorder: resolveRecorder(value),
    profile: resolveProfile(value),
  };
}
