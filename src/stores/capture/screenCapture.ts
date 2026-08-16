import {execAsync} from 'ags/process';
import {type Timer, idle} from 'ags/time';

import {closeAllControlCentersImmediately} from '../shell/windowManager';
import {type RecordingMode, startRecord} from './recording';

export type ScreenshotMode = 'crop' | 'freeze' | 'monitor';

let pendingCapture: Timer | null = null;

function scheduleCapture(action: () => void) {
  closeAllControlCentersImmediately();
  pendingCapture?.cancel();
  pendingCapture = idle(() => {
    pendingCapture = null;
    action();
  });
}

export function captureScreenshot(mode: ScreenshotMode) {
  scheduleCapture(() => {
    execAsync(`hyprcrop ${mode}`).catch(console.error);
  });
}

export function beginRecording(mode: RecordingMode) {
  scheduleCapture(() => {
    void startRecord(mode);
  });
}
