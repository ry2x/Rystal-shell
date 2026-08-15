import { createExternal } from 'ags';
import { execAsync } from 'ags/process';
import { type Timer, timeout } from 'ags/time';

import { closeAllControlCenters } from '../shell/windowManager';

const NORMAL_INTERVAL_MS = 30 * 60_000;
const RETRY_INTERVAL_MS = 60_000;

let requestRefresh: (() => Promise<void>) | null = null;

export function openUpdateManager() {
  closeAllControlCenters();
  execAsync('kitty --title PacUpdate par_tui')
    .then(() => requestRefresh?.())
    .catch(console.error);
}

export const updatesPoll = createExternal('0', (setUpdates) => {
  let refreshTimer: Timer | null = null;
  let refreshPromise: Promise<void> | null = null;
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

  async function runRefresh() {
    try {
      const output = await execAsync([
        'bash',
        '-c',
        "ping -c 1 -W 2 archlinux.org >/dev/null && timeout 15 bash -c '(checkupdates 2>/dev/null; paru -Qu 2>/dev/null) | wc -l'",
      ]);
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
    if (requestRefresh === refreshUpdates) requestRefresh = null;
  };
});
