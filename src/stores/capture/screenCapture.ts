import {execAsync} from 'ags/process';
import {type Timer, idle} from 'ags/time';

import {type RecordingMode, startRecord} from '@/stores/capture/recording';
import {closeAllControlCentersImmediately} from '@/stores/shell/windowManager';

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
