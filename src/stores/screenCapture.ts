import { execAsync } from 'ags/process';
import { type Timer, timeout } from 'ags/time';

import { type RecordingMode, startRecord } from './recording';
import { closeAllControlCenters } from './windowManager';

export type ScreenshotMode = 'crop' | 'freeze' | 'monitor';

const CAPTURE_DELAY_MS = 300;

let pendingCapture: Timer | null = null;

function scheduleCapture(action: () => void) {
  closeAllControlCenters();
  pendingCapture?.cancel();
  pendingCapture = timeout(CAPTURE_DELAY_MS, () => {
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
