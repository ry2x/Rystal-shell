import {createExternal} from 'ags';
import {type Process, execAsync, subprocess} from 'ags/process';
import {type Timer, timeout} from 'ags/time';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';

import {closeAllControlCenters} from '@/stores/shell/windowManager';

const NORMAL_INTERVAL_MS = 30 * 60_000;
const RETRY_INTERVAL_MS = 60_000;
const UPDATE_TIMEOUT_SECONDS = '15';
const CONNECTIVITY_CHECK_URLS = [
  'http://ping.archlinux.org/nm-check.txt',
  'http://detectportal.firefox.com/success.txt',
  'https://connectivitycheck.gstatic.com/generate_204',
  'http://captive.apple.com/hotspot-detect.html',
] as const;

const connectivitySession = new Soup.Session({timeout: 5});

function sendAndRead(message: Soup.Message, cancellable: Gio.Cancellable): Promise<GLib.Bytes> {
  return new Promise((resolve, reject) => {
    connectivitySession.send_and_read_async(
      message,
      GLib.PRIORITY_DEFAULT,
      cancellable,
      (_session, result) => {
        try {
          resolve(connectivitySession.send_and_read_finish(result));
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

async function hasConnectivity(cancellable: Gio.Cancellable, index = 0): Promise<boolean> {
  const url = CONNECTIVITY_CHECK_URLS[index];
  if (url === undefined) return false;

  try {
    const message = Soup.Message.new('GET', url);
    await sendAndRead(message, cancellable);
    if (message.status_code >= 200 && message.status_code < 400) return true;
    console.warn(`Connectivity check returned ${message.status_code}: ${url}`);
  } catch (error) {
    if (!cancellable.is_cancelled()) console.warn(`Connectivity check failed: ${url}`, error);
  }

  return hasConnectivity(cancellable, index + 1);
}

function countOutputLines(output: string) {
  return output.split('\n').filter(line => line.trim().length > 0).length;
}

let requestRefresh: (() => Promise<void>) | null = null;

export function openUpdateManager() {
  closeAllControlCenters();
  execAsync(['kitty', '--title', 'PacUpdate', 'par_tui'])
    .then(() => requestRefresh?.())
    .catch(console.error);
}

export const updatesPoll = createExternal('0', setUpdates => {
  const updateProcesses = new Set<Process>();
  let refreshTimer: Timer | null = null;
  let refreshPromise: Promise<void> | null = null;
  let connectivityCancellable: Gio.Cancellable | null = null;
  let active = true;

  function clearRefreshTimer() {
    refreshTimer?.cancel();
    refreshTimer = null;
  }

  function scheduleRefresh(delay: number) {
    if (!active) return;
    clearRefreshTimer();
    refreshTimer = timeout(delay, () => {
      refreshTimer = null;
      void refreshUpdates();
    });
  }

  function countCommandUpdates(command: string[]): Promise<number> {
    return new Promise(resolve => {
      let count = 0;
      const process = subprocess(
        ['timeout', UPDATE_TIMEOUT_SECONDS, ...command],
        output => {
          count += countOutputLines(output);
        },
        error => console.warn(`${command.join(' ')}: ${error}`)
      );
      updateProcesses.add(process);
      process.connect('exit', () => {
        updateProcesses.delete(process);
        resolve(count);
      });
    });
  }

  async function isOnline() {
    connectivityCancellable = new Gio.Cancellable();

    try {
      return await hasConnectivity(connectivityCancellable);
    } finally {
      connectivityCancellable = null;
    }
  }

  async function collectUpdateCount() {
    const counts = await Promise.all([
      countCommandUpdates(['checkupdates']),
      countCommandUpdates(['paru', '-Qua']),
    ]);
    return counts[0] + counts[1];
  }

  async function runRefresh() {
    try {
      if (!(await isOnline())) {
        if (active) scheduleRefresh(RETRY_INTERVAL_MS);
        return;
      }

      const output = String(await collectUpdateCount());
      if (!active) return;
      if (output !== updatesPoll.peek()) setUpdates(output);
      scheduleRefresh(NORMAL_INTERVAL_MS);
    } catch (error) {
      if (!active) return;
      console.error(error);
      scheduleRefresh(RETRY_INTERVAL_MS);
    }
  }

  function refreshUpdates() {
    if (refreshPromise) return refreshPromise;

    clearRefreshTimer();
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  requestRefresh = refreshUpdates;
  void refreshUpdates();

  return () => {
    active = false;
    clearRefreshTimer();
    for (const process of updateProcesses) process.kill();
    updateProcesses.clear();
    connectivityCancellable?.cancel();
    connectivityCancellable = null;
    if (requestRefresh === refreshUpdates) requestRefresh = null;
  };
});
