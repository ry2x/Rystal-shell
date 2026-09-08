import {execAsync} from 'ags/process';

import GLib from 'gi://GLib';

import {sendNotification} from '@/stores/notification/send';
import {closeAllControlCenters} from '@/stores/shell/windowManager';

const AUDIO_SETTING = 'pavucontrol';
const BLUETOOTH_SETTING = 'blueman-manager';
const WIFI_SETTING = 'nm-connection-editor';
const UPDATE_APP = 'kitty --title PacUpdate par_tui';

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
  openExternalApp(AUDIO_SETTING);
}

export function openBluetoothSettings() {
  openExternalApp(BLUETOOTH_SETTING);
}

export function openWifiSettings() {
  openExternalApp(WIFI_SETTING);
}

export function openUpdateApp(onExit: () => void) {
  openExternalApp(UPDATE_APP, onExit);
}
