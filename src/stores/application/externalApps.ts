import {execAsync} from 'ags/process';

import GLib from 'gi://GLib';

import {sendNotification} from '@/stores/notification/send';
import {closeAllControlCenters} from '@/stores/shell/windowManager';

const AUDIO_SETTING = 'pavucontrol';
const BLUETOOTH_SETTING = 'blueman-manager';
const WIFI_SETTING = 'nm-connection-editor';

function notifyLaunchFailure(app: string, detail: string) {
  sendNotification({
    summary: `Unable to open ${app}`,
    body: detail,
  });
}

function openExternalSettings(app: string) {
  closeAllControlCenters();

  if (!GLib.find_program_in_path(app)) {
    const detail = `${app} is not installed or is not available in PATH.`;
    console.error(`Unable to open ${app}: ${detail}`);
    notifyLaunchFailure(app, detail);
    return;
  }

  execAsync([app]).catch(error => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Unable to open ${app}:`, error);
    notifyLaunchFailure(app, detail);
  });
}

export function openAudioControl() {
  openExternalSettings(AUDIO_SETTING);
}

export function openBluetoothSettings() {
  openExternalSettings(BLUETOOTH_SETTING);
}

export function openWifiSettings() {
  openExternalSettings(WIFI_SETTING);
}
