import {execAsync} from 'ags/process';

import GLib from 'gi://GLib';

import {sendNotification} from '@/stores/notification/send';
import {closeAllControlCenters} from '@/stores/shell/windowManager';

interface ExternalSettingsApp {
  label: string;
  program: string;
}

const AUDIO_CONTROL: ExternalSettingsApp = {
  label: 'sound settings',
  program: 'pavucontrol',
};

const BLUETOOTH_SETTINGS: ExternalSettingsApp = {
  label: 'Bluetooth settings',
  program: 'blueman-manager',
};

const WIFI_SETTINGS: ExternalSettingsApp = {
  label: 'Wi-Fi settings',
  program: 'nm-connection-editor',
};

function notifyLaunchFailure(app: ExternalSettingsApp, detail: string) {
  sendNotification({
    summary: `Unable to open ${app.label}`,
    body: detail,
  });
}

function openExternalSettings(app: ExternalSettingsApp) {
  closeAllControlCenters();

  if (!GLib.find_program_in_path(app.program)) {
    const detail = `${app.program} is not installed or is not available in PATH.`;
    console.error(`Unable to open ${app.label}: ${detail}`);
    notifyLaunchFailure(app, detail);
    return;
  }

  execAsync([app.program]).catch(error => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Unable to open ${app.label}:`, error);
    notifyLaunchFailure(app, detail);
  });
}

export function openAudioControl() {
  openExternalSettings(AUDIO_CONTROL);
}

export function openBluetoothSettings() {
  openExternalSettings(BLUETOOTH_SETTINGS);
}

export function openWifiSettings() {
  openExternalSettings(WIFI_SETTINGS);
}
