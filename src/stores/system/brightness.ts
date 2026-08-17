import {createState} from 'ags';
import {type Timer, timeout} from 'ags/time';

import {sendNotification} from '@/stores/notification/send';
import {
  BrightnessBackendController,
  clampBrightnessPercent,
} from '@/stores/system/brightnessBackend';

const KEYBOARD_STEP = 10;
const DEFAULT_RESTORE_BRIGHTNESS = 0.25;
const BRIGHTNESS_PRESETS = [0, 0.25, 0.5, 0.75, 1];

const [brightnessState, setBrightnessState] = createState(0.5);
export const brightness = brightnessState;

let setTimer: Timer | null = null;
let scheduledTarget: number | null = null;
let lastNonZeroBrightness: number | null = null;

interface BrightnessRequest {
  resolve: (percent: number) => void;
  reject: (error: Error) => void;
}

interface PendingBrightnessApply {
  percent: number;
  requests: BrightnessRequest[];
}

let pendingApply: PendingBrightnessApply | null = null;
let applyWorker: Promise<void> | null = null;
let changeQueue = Promise.resolve();

function rememberNonZeroBrightness(value: number) {
  if (value > 0) lastNonZeroBrightness = value;
}

function cancelSetTimer() {
  setTimer?.cancel();
  setTimer = null;
}

const brightnessBackend = new BrightnessBackendController();

function notify(percent: number) {
  sendNotification({
    summary: `Brightness: ${percent}%`,
    body:
      brightnessBackend.current === 'ddcutil'
        ? 'DDC/CI display brightness'
        : 'System backlight brightness',
    transient: true,
  });
}

async function processApplyQueue() {
  const request = pendingApply;
  if (!request) return;
  pendingApply = null;

  try {
    await brightnessBackend.applyPercent(request.percent);
    const value = request.percent / 100;
    rememberNonZeroBrightness(value);
    setBrightnessState(value);
    request.requests.forEach(({resolve}) => resolve(request.percent));
  } catch (error) {
    const applyError = error instanceof Error ? error : new Error(String(error));
    request.requests.forEach(({reject}) => reject(applyError));
  }

  await processApplyQueue();
}

function ensureApplyWorker() {
  if (applyWorker) return;

  applyWorker = processApplyQueue().finally(() => {
    applyWorker = null;
    if (pendingApply) ensureApplyWorker();
  });
}

function requestBrightnessApply(percent: number) {
  return new Promise<number>((resolve, reject) => {
    const request = {resolve, reject};
    if (pendingApply) {
      pendingApply.percent = percent;
      pendingApply.requests.push(request);
    } else {
      pendingApply = {percent, requests: [request]};
    }
    ensureApplyWorker();
  });
}

async function waitForApplyQueue() {
  if (applyWorker) await applyWorker;
}

async function flushScheduledApply() {
  cancelSetTimer();
  const target = scheduledTarget;
  scheduledTarget = null;
  if (target !== null) await requestBrightnessApply(target);
  await waitForApplyQueue();
}

export function setBrightness(value: number) {
  const percent = clampBrightnessPercent(value * 100);
  const normalizedValue = percent / 100;
  rememberNonZeroBrightness(normalizedValue);
  setBrightnessState(normalizedValue);
  scheduledTarget = percent;

  cancelSetTimer();
  setTimer = timeout(100, () => {
    setTimer = null;
    const target = scheduledTarget;
    scheduledTarget = null;
    if (target === null) return;

    void requestBrightnessApply(target).catch(async error => {
      console.error('Failed to set brightness:', error);
      try {
        await refreshBrightness();
      } catch (refreshError) {
        console.error('Failed to refresh brightness after apply failure:', refreshError);
      }
    });
  });
}

export function toggleBrightnessDim() {
  const current = brightness();
  if (current > 0) {
    lastNonZeroBrightness = current;
    setBrightness(0);
    return;
  }

  setBrightness(lastNonZeroBrightness ?? DEFAULT_RESTORE_BRIGHTNESS);
}

export function cycleBrightnessPreset() {
  const current = brightness();
  const next = BRIGHTNESS_PRESETS.find(preset => preset > current) ?? BRIGHTNESS_PRESETS[0];
  setBrightness(next);
}

async function performBrightnessChange(delta: number) {
  try {
    await flushScheduledApply();
    const next = clampBrightnessPercent((await brightnessBackend.getPercent()) + delta);
    await requestBrightnessApply(next);
    notify(next);
    return next;
  } catch (error) {
    console.error('Failed to change brightness:', error);
    throw error;
  }
}

export function changeBrightness(delta: number): Promise<number> {
  const operation = changeQueue.then(() => performBrightnessChange(delta));
  changeQueue = operation.then(
    () => {},
    () => {}
  );
  return operation;
}

export async function refreshBrightness() {
  await flushScheduledApply();
  const percent = await brightnessBackend.getPercent();
  const value = percent / 100;
  rememberNonZeroBrightness(value);
  setBrightnessState(value);
  return percent;
}

export async function refreshBrightnessBackend() {
  brightnessBackend.reset();
  return refreshBrightness();
}

export async function getBrightnessBackend() {
  return brightnessBackend.resolve();
}

export const brightnessStep = KEYBOARD_STEP;

void refreshBrightness().catch(error =>
  console.error('Failed to fetch initial brightness:', error)
);
