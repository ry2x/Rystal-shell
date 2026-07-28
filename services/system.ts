import { createState } from 'ags';
import { execAsync } from 'ags/process';
import { interval } from 'ags/time';

import GLib from 'gi://GLib?version=2.0';

import { closeAllControlCenters } from './windowManager';

export const userName = '@' + GLib.get_user_name();

export function getOsInfo(): string {
  let osName = 'Linux';
  try {
    if (GLib.file_test('/etc/os-release', GLib.FileTest.EXISTS)) {
      const [success, bytes] = GLib.file_get_contents('/etc/os-release');
      if (success && bytes) {
        const text = new TextDecoder('utf-8').decode(bytes);
        const match = text.match(/PRETTY_NAME="([^"]+)"/);
        if (match) {
          osName = match[1];
        }
      }
    }
  } catch (error) {
    console.error('Failed to read os-release:', error);
  }

  const wm = GLib.getenv('XDG_CURRENT_DESKTOP') || GLib.getenv('DESKTOP_SESSION') || 'Hyprland';
  return `${osName} • ${wm}`;
}

export function openSystemMonitor() {
  closeAllControlCenters();
  execAsync('kitty --title TempTerminal btm').catch(console.error);
}

export interface RamData {
  used: number;
  total: number;
  percent: number;
}

export const [cpuUsage, setCpuUsage] = createState(0);
export const [ramUsage, setRamUsage] = createState<RamData>({ used: 0, total: 0, percent: 0 });
export const [gpuUsage, setGpuUsage] = createState(0);
export const [uptime, setUptime] = createState('0m');

interface CpuCounters {
  total: number;
  idle: number;
}

let previousCpuCounters: CpuCounters | null = null;

function readText(path: string) {
  try {
    const [success, bytes] = GLib.file_get_contents(path);
    return success && bytes ? new TextDecoder('utf-8').decode(bytes) : null;
  } catch {
    return null;
  }
}

function readCpuCounters(): CpuCounters | null {
  const firstLine = readText('/proc/stat')?.split('\n')[0];
  if (!firstLine) return null;

  const fields = firstLine.trim().split(/\s+/).slice(1).map(Number);
  if (fields.length < 5 || fields.some((value) => !Number.isFinite(value))) return null;

  return {
    total: fields.reduce((sum, value) => sum + value, 0),
    idle: fields[3] + fields[4],
  };
}

function updateCpuUsage() {
  const current = readCpuCounters();
  if (!current) return;

  const previous = previousCpuCounters;
  previousCpuCounters = current;
  if (!previous) return;

  const totalDelta = current.total - previous.total;
  const idleDelta = current.idle - previous.idle;
  if (totalDelta <= 0) return;

  setCpuUsage(Math.max(0, Math.min(100, 100 * (1 - idleDelta / totalDelta))));
}

function updateRamUsage() {
  const meminfo = readText('/proc/meminfo');
  if (!meminfo) return;

  const total = Number(meminfo.match(/^MemTotal:\s+(\d+)/m)?.[1]);
  const available = Number(meminfo.match(/^MemAvailable:\s+(\d+)/m)?.[1]);
  if (!Number.isFinite(total) || !Number.isFinite(available) || total <= 0) return;

  const used = total - available;
  setRamUsage({
    used: used / 1024 / 1024,
    total: total / 1024 / 1024,
    percent: used / total,
  });
}

function updateGpuUsage() {
  let highestUsage = 0;

  for (let card = 0; card < 32; card++) {
    const usage = Number(readText(`/sys/class/drm/card${card}/device/gpu_busy_percent`)?.trim());
    if (Number.isFinite(usage)) highestUsage = Math.max(highestUsage, usage);
  }

  setGpuUsage(highestUsage);
}

function formatUptime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`);
  }

  return `up ${parts.join(', ')}`;
}

function updateUptime() {
  const seconds = Number(readText('/proc/uptime')?.split(/\s+/)[0]);
  if (Number.isFinite(seconds) && seconds >= 0) setUptime(formatUptime(seconds));
}

function pollSystemMetrics() {
  updateCpuUsage();
  updateRamUsage();
  updateGpuUsage();
  updateUptime();
}

pollSystemMetrics();
export const systemPoll = interval(2000, pollSystemMetrics);
