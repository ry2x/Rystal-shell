import { createExternal } from 'ags';
import { execAsync } from 'ags/process';
import { idle, interval } from 'ags/time';

import GLib from 'gi://GLib?version=2.0';

import { closeAllControlCenters } from '../shell/windowManager';

export const userName = '@' + GLib.get_user_name();

export function getOsInfo(): string {
  let osName = 'Linux';
  try {
    if (GLib.file_test('/etc/os-release', GLib.FileTest.EXISTS)) {
      const [success, bytes] = GLib.file_get_contents('/etc/os-release');
      if (success && bytes) {
        const text = new TextDecoder('utf-8').decode(bytes);
        const match = text.match(/PRETTY_NAME="([^"]+)"/);
        if (match) osName = match[1];
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

interface CpuCounters {
  total: number;
  idle: number;
}

interface SystemMetrics {
  cpu: number;
  ram: RamData;
  gpu: number;
}

const EMPTY_RAM: RamData = { used: 0, total: 0, percent: 0 };
const INITIAL_METRICS: SystemMetrics = { cpu: 0, ram: EMPTY_RAM, gpu: 0 };
const textDecoder = new TextDecoder('utf-8');
const gpuBusyPaths = Array.from(
  { length: 32 },
  (_, card) => `/sys/class/drm/card${card}/device/gpu_busy_percent`,
).filter((path) => GLib.file_test(path, GLib.FileTest.EXISTS));

function readText(path: string) {
  try {
    const [success, bytes] = GLib.file_get_contents(path);
    return success && bytes ? textDecoder.decode(bytes) : null;
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

function calculateCpuUsage(current: CpuCounters, previous: CpuCounters) {
  const totalDelta = current.total - previous.total;
  const idleDelta = current.idle - previous.idle;
  if (totalDelta <= 0) return 0;
  return Math.max(0, Math.min(100, 100 * (1 - idleDelta / totalDelta)));
}

function readRamUsage(): RamData | null {
  const meminfo = readText('/proc/meminfo');
  if (!meminfo) return null;

  const total = Number(meminfo.match(/^MemTotal:\s+(\d+)/m)?.[1]);
  const available = Number(meminfo.match(/^MemAvailable:\s+(\d+)/m)?.[1]);
  if (!Number.isFinite(total) || !Number.isFinite(available) || total <= 0) return null;

  const used = total - available;
  return {
    used: used / 1024 / 1024,
    total: total / 1024 / 1024,
    percent: used / total,
  };
}

function readGpuUsage() {
  let highestUsage = 0;
  for (const path of gpuBusyPaths) {
    const usage = Number(readText(path)?.trim());
    if (Number.isFinite(usage)) highestUsage = Math.max(highestUsage, usage);
  }
  return highestUsage;
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

function readUptime() {
  const seconds = Number(readText('/proc/uptime')?.split(/\s+/)[0]);
  return Number.isFinite(seconds) && seconds >= 0 ? formatUptime(seconds) : null;
}

const systemMetrics = createExternal(INITIAL_METRICS, (setMetrics) => {
  let previousCpuCounters = readCpuCounters();

  function updateMetrics() {
    const currentCpuCounters = readCpuCounters();
    const previousMetrics = systemMetrics.peek();
    const cpu =
      currentCpuCounters && previousCpuCounters
        ? calculateCpuUsage(currentCpuCounters, previousCpuCounters)
        : previousMetrics.cpu;
    previousCpuCounters = currentCpuCounters ?? previousCpuCounters;

    setMetrics({
      cpu,
      ram: readRamUsage() ?? previousMetrics.ram,
      gpu: readGpuUsage(),
    });
  }

  const initialUpdate = idle(updateMetrics);
  const poll = interval(2000, updateMetrics);
  return () => {
    initialUpdate.cancel();
    poll.cancel();
  };
});

export const cpuUsage = systemMetrics.as((metrics) => metrics.cpu);
export const ramUsage = systemMetrics.as((metrics) => metrics.ram);
export const gpuUsage = systemMetrics.as((metrics) => metrics.gpu);

export const uptime = createExternal('0m', (setUptime) => {
  function updateUptime() {
    const value = readUptime();
    if (value !== null) setUptime(value);
  }

  const initialUpdate = idle(updateUptime);
  const poll = interval(60_000, updateUptime);
  return () => {
    initialUpdate.cancel();
    poll.cancel();
  };
});
