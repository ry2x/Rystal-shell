import { createState } from 'ags';
import { execAsync } from 'ags/process';

import GLib from 'gi://GLib';

import { sendNotification } from '../lib/notification';
import { appConfig } from './config';

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
let pendingTarget: number | null = null;
let isSetting = false;
let setTimer: ReturnType<typeof setTimeout> | null = null;
let lastNonZeroBrightness: number | null = null;

function rememberNonZeroBrightness(value: number) {
  if (value > 0) lastNonZeroBrightness = value;
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

async function processSet() {
  if (isSetting || pendingTarget === null) return;

  isSetting = true;
  const target = pendingTarget;
  pendingTarget = null;

  try {
    await applyPercent(target);
    const value = target / 100;
    rememberNonZeroBrightness(value);
    setBrightnessState(value);
  } catch (error) {
    console.error('Failed to set brightness:', error);
  } finally {
    isSetting = false;
    if (pendingTarget !== null) void processSet();
  }
}

export function setBrightness(value: number) {
  const percent = clampPercent(value * 100);
  const normalizedValue = percent / 100;
  rememberNonZeroBrightness(normalizedValue);
  setBrightnessState(normalizedValue);
  pendingTarget = percent;

  if (setTimer) clearTimeout(setTimer);
  setTimer = setTimeout(() => {
    setTimer = null;
    void processSet();
  }, 100);
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

export async function changeBrightness(delta: number) {
  try {
    const next = clampPercent((await getPercent()) + delta);
    pendingTarget = next;
    if (setTimer) {
      clearTimeout(setTimer);
      setTimer = null;
    }
    await processSet();
    notify(next);
    return next;
  } catch (error) {
    console.error('Failed to change brightness:', error);
    throw error;
  }
}

export async function refreshBrightness() {
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
