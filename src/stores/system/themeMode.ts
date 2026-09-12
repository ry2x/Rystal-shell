import {createState} from 'ags';
import {execAsync} from 'ags/process';
import {type Timer, timeout} from 'ags/time';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {rystalShellStateDir} from '@/lib/paths';
import {sendNotification} from '@/stores/notification/send';

export type ThemeMode = 'dark' | 'light';

const switcherAvailableValue = Boolean(GLib.find_program_in_path('theme-switch.sh'));
const [themeModeValue, setThemeModeValue] = createState<ThemeMode>('dark');
const [themeModeBusyValue, setThemeModeBusy] = createState(false);
const [themeModeErrorValue, setThemeModeError] = createState('');

export const themeMode = themeModeValue;
export const themeModeBusy = themeModeBusyValue;
export const themeModeError = themeModeErrorValue;
export const themeSwitcherAvailable = switcherAvailableValue;

let pendingOperations = 0;
let operationQueue = Promise.resolve();
let modeMonitor: Gio.FileMonitor | null = null;
let refreshTimer: Timer | null = null;

function parseThemeMode(output: string): ThemeMode {
  const value = output.trim();
  if (value === 'dark' || value === 'light') return value;
  throw new Error(`Theme switcher returned an invalid mode: ${value || '(empty)'}`);
}

function requireThemeSwitcher() {
  if (!themeSwitcherAvailable) {
    throw new Error('Theme switcher (theme-switch.sh) not found in PATH');
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function scheduleThemeOperation<T>(operation: () => Promise<T>): Promise<T> {
  pendingOperations += 1;
  setThemeModeBusy(true);

  const result = operationQueue.then(operation);
  operationQueue = result
    .then(
      () => undefined,
      () => undefined
    )
    .finally(() => {
      pendingOperations -= 1;
      setThemeModeBusy(pendingOperations > 0);
    });
  return result;
}

export function refreshThemeMode(): Promise<ThemeMode> {
  return scheduleThemeOperation(async () => {
    requireThemeSwitcher();
    try {
      const mode = parseThemeMode(await execAsync(['theme-switch.sh', 'status']));
      setThemeModeValue(mode);
      setThemeModeError('');
      return mode;
    } catch (error) {
      setThemeModeError(errorMessage(error));
      throw error;
    }
  });
}

function setThemeMode(mode: ThemeMode): Promise<ThemeMode> {
  return scheduleThemeOperation(async () => {
    requireThemeSwitcher();
    try {
      await execAsync(['theme-switch.sh', 'mode', mode]);
      setThemeModeValue(mode);
      setThemeModeError('');
      return mode;
    } catch (error) {
      const detail = errorMessage(error);
      setThemeModeError(detail);
      sendNotification({
        summary: 'Unable to change appearance',
        body: detail,
      });
      throw error;
    }
  });
}

export function toggleThemeMode(): Promise<ThemeMode> {
  return setThemeMode(themeMode.peek() === 'light' ? 'dark' : 'light');
}

function monitorThemeMode() {
  const themeStateDirectory = `${rystalShellStateDir}/theme`;
  GLib.mkdir_with_parents(themeStateDirectory, 0o700);

  try {
    modeMonitor = Gio.File.new_for_path(themeStateDirectory).monitor_directory(
      Gio.FileMonitorFlags.NONE,
      null
    );
    modeMonitor.connect('changed', (_monitor, file) => {
      if (file.get_basename() !== 'mode') return;
      refreshTimer?.cancel();
      refreshTimer = timeout(100, () => {
        refreshTimer = null;
        void refreshThemeMode().catch(error => {
          console.error('Failed to refresh theme mode:', error);
        });
      });
    });
  } catch (error) {
    console.error('Failed to monitor theme mode:', error);
  }
}

export function cleanupThemeMode() {
  refreshTimer?.cancel();
  refreshTimer = null;
  modeMonitor?.cancel();
  modeMonitor = null;
}

monitorThemeMode();
void refreshThemeMode().catch(error => {
  console.error('Failed to initialize theme mode:', error);
});
