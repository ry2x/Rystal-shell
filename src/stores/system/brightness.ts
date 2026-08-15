import { createState } from 'ags';
import { execAsync } from 'ags/process';
import { type Timer, timeout } from 'ags/time';

import GLib from 'gi://GLib';

import { appConfig } from '../../lib/config';
import { sendNotification } from '../notification/send';

type BrightnessBackend = 'ddcutil' | 'brightnessctl';
type ConfiguredBackend = BrightnessBackend | 'auto';

const DDC_VCP_BRIGHTNESS = '10';
const KEYBOARD_STEP = 10;
const DEFAULT_RESTORE_BRIGHTNESS = 0.25;
const BRIGHTNESS_PRESETS = [0, 0.25, 0.5, 0.75, 1];

const [brightnessState, setBrightnessState] = createState(0.5);
export const brightness = brightnessState;

let backend: BrightnessBackend | null = null;
let ddcBuses: string[] = [];
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

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parsePercent(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) return clampPercent(Number(match[1]));

  const numeric = Number(value.trim());
  return Number.isFinite(numeric) ? clampPercent(numeric) : null;
}

function hasProgram(name: string) {
  return GLib.find_program_in_path(name) !== null;
}

async function detectDdcBuses() {
  if (!hasProgram('ddcutil')) return [];

  try {
    const output = await execAsync(['ddcutil', 'detect']);
    return [...output.matchAll(/I2C bus:\s*\/dev\/i2c-(\d+)/g)].map((match) => match[1]);
  } catch (error) {
    console.warn('DDC/CI detection failed:', error);
    return [];
  }
}

async function resolveBackend() {
  if (backend) return backend;

  const configured = (appConfig.brightness?.backend ?? 'auto') as ConfiguredBackend;
  if (configured === 'ddcutil' || configured === 'auto') {
    ddcBuses = await detectDdcBuses();
    if (ddcBuses.length > 0) {
      backend = 'ddcutil';
      return backend;
    }
    if (configured === 'ddcutil') {
      throw new Error('No DDC/CI-compatible display was detected');
    }
  }

  if (configured === 'brightnessctl' || configured === 'auto') {
    if (hasProgram('brightnessctl')) {
      backend = 'brightnessctl';
      return backend;
    }
  }

  throw new Error(`Brightness backend '${configured}' is unavailable`);
}

async function getDdcBrightnessDetails(bus: string) {
  const output = await execAsync([
    'ddcutil',
    '--bus',
    bus,
    'getvcp',
    DDC_VCP_BRIGHTNESS,
    '--terse',
  ]);
  const fields = output.trim().split(/\s+/);
  const current = Number(fields[3]);
  const maximum = Number(fields[4]);
  if (!Number.isFinite(current) || !Number.isFinite(maximum) || maximum <= 0) {
    throw new Error(`Unable to parse DDC/CI brightness: ${output.trim()}`);
  }
  return { current, maximum };
}

async function getDdcBrightness() {
  const bus = ddcBuses[0];
  if (!bus) throw new Error('No DDC/CI bus is available');
  const { current, maximum } = await getDdcBrightnessDetails(bus);
  return clampPercent((current / maximum) * 100);
}

async function getBrightnessctlBrightness() {
  const output = await execAsync(['brightnessctl', '-m']);
  const percent = parsePercent(output.split(',')[3] ?? output);
  if (percent === null) throw new Error(`Unable to parse brightnessctl output: ${output.trim()}`);
  return percent;
}

async function getPercent() {
  const selected = await resolveBackend();
  return selected === 'ddcutil' ? getDdcBrightness() : getBrightnessctlBrightness();
}

async function applyPercent(percent: number) {
  const selected = await resolveBackend();
  if (selected === 'ddcutil') {
    const displays = await Promise.all(
      ddcBuses.map(async (bus) => ({ bus, ...(await getDdcBrightnessDetails(bus)) })),
    );
    await Promise.all(
      displays.map(({ bus, maximum }) =>
        execAsync([
          'ddcutil',
          '--bus',
          bus,
          'setvcp',
          DDC_VCP_BRIGHTNESS,
          String(Math.round((percent / 100) * maximum)),
        ]),
      ),
    );
    return;
  }

  await execAsync(['brightnessctl', 'set', `${percent}%`]);
}

function notify(percent: number) {
  sendNotification({
    summary: `Brightness: ${percent}%`,
    body: backend === 'ddcutil' ? 'DDC/CI display brightness' : 'System backlight brightness',
    transient: true,
  });
}

async function processApplyQueue() {
  const request = pendingApply;
  if (!request) return;
  pendingApply = null;

  try {
    await applyPercent(request.percent);
    const value = request.percent / 100;
    rememberNonZeroBrightness(value);
    setBrightnessState(value);
    request.requests.forEach(({ resolve }) => resolve(request.percent));
  } catch (error) {
    const applyError = error instanceof Error ? error : new Error(String(error));
    request.requests.forEach(({ reject }) => reject(applyError));
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
    const request = { resolve, reject };
    if (pendingApply) {
      pendingApply.percent = percent;
      pendingApply.requests.push(request);
    } else {
      pendingApply = { percent, requests: [request] };
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
  const percent = clampPercent(value * 100);
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

    void requestBrightnessApply(target).catch(async (error) => {
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
  const next = BRIGHTNESS_PRESETS.find((preset) => preset > current) ?? BRIGHTNESS_PRESETS[0];
  setBrightness(next);
}

async function performBrightnessChange(delta: number) {
  try {
    await flushScheduledApply();
    const next = clampPercent((await getPercent()) + delta);
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
    () => {},
  );
  return operation;
}

export async function refreshBrightness() {
  await flushScheduledApply();
  const percent = await getPercent();
  const value = percent / 100;
  rememberNonZeroBrightness(value);
  setBrightnessState(value);
  return percent;
}

export async function refreshBrightnessBackend() {
  backend = null;
  ddcBuses = [];
  return refreshBrightness();
}

export async function getBrightnessBackend() {
  return resolveBackend();
}

export const brightnessStep = KEYBOARD_STEP;

void refreshBrightness().catch((error) =>
  console.error('Failed to fetch initial brightness:', error),
);
