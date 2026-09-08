type BrightnessBackendConfig = 'auto' | 'ddcutil' | 'brightnessctl';
type RecorderAudioSource = 'system' | 'mic';
type UiScale = 0.75 | 1 | 1.25 | 1.5 | 2;

export interface WorldClockConfig {
  label: string;
  tz: string;
}

interface ExternalAppsConfig {
  audioControl: string;
  bluetoothSettings: string;
  wifiSettings: string;
  updateManager: string;
}

export interface AppConfig {
  ui: {scale: UiScale};
  brightness: {backend: BrightnessBackendConfig};
  weather: {location: string};
  notifications: {maxCount: number};
  externalApps: ExternalAppsConfig;
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

export type ConfigObject = Record<string, unknown>;
