import {execAsync} from 'ags/process';

import GLib from 'gi://GLib';

import {appConfig} from '@/lib/config';
import {sendNotification} from '@/stores/notification/send';
import {closeAllControlCenters} from '@/stores/shell/windowManager';

function notifyLaunchFailure(app: string, detail: string) {
  sendNotification({
    summary: `Unable to open ${app}`,
    body: detail,
  });
}

function parseCommand(command: string) {
  const [, argv] = GLib.shell_parse_argv(command);
  if (!argv?.[0]) throw new Error('The configured command is empty.');
  return argv;
}

function getAppName(command: string) {
  try {
    return GLib.path_get_basename(parseCommand(command)[0]);
  } catch {
    return 'configured app';
  }
}

export const audioControlAppName = getAppName(appConfig.externalApps.audioControl);
export const bluetoothSettingsAppName = getAppName(appConfig.externalApps.bluetoothSettings);
export const wifiSettingsAppName = getAppName(appConfig.externalApps.wifiSettings);

function openExternalApp(command: string, onExit?: () => void) {
  closeAllControlCenters();

  let argv: string[];
  try {
    argv = parseCommand(command);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Unable to parse external app command "${command}":`, error);
    notifyLaunchFailure(command, detail);
    return;
  }

  const app = argv[0];
  if (!GLib.find_program_in_path(app)) {
    const detail = `${app} is not installed or is not available in PATH.`;
    console.error(`Unable to open ${app}: ${detail}`);
    notifyLaunchFailure(app, detail);
    return;
  }

  execAsync(argv).then(
    () => onExit?.(),
    error => {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`Unable to open ${app}:`, error);
      notifyLaunchFailure(app, detail);
    }
  );
}

export function openAudioControl() {
  openExternalApp(appConfig.externalApps.audioControl);
}

export function openBluetoothSettings() {
  openExternalApp(appConfig.externalApps.bluetoothSettings);
}

export function openWifiSettings() {
  openExternalApp(appConfig.externalApps.wifiSettings);
}

export function openUpdateApp(onExit: () => void) {
  openExternalApp(appConfig.externalApps.updateManager, onExit);
}
