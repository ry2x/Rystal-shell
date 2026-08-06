import { createState } from 'ags';
import { execAsync } from 'ags/process';

import { closeAllControlCenters } from './windowManager';

const NORMAL_INTERVAL_MS = 30 * 60_000;
const RETRY_INTERVAL_MS = 60_000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshPromise: Promise<void> | null = null;

export function openUpdateManager() {
  closeAllControlCenters();
  execAsync('kitty --title PacUpdate par_tui')
    .then(() => refreshUpdates())
    .catch(console.error);
}

export const [updatesPoll, setUpdates] = createState('0');

function clearRefreshTimer() {
  if (refreshTimer === null) return;
  clearTimeout(refreshTimer);
  refreshTimer = null;
}

function scheduleRefresh(delay: number) {
  clearRefreshTimer();
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshUpdates();
  }, delay);
}

async function runRefresh() {
  try {
    const out = await execAsync([
      'bash',
      '-c',
      "ping -c 1 -W 2 archlinux.org >/dev/null && timeout 15 bash -c '(checkupdates 2>/dev/null; paru -Qu 2>/dev/null) | wc -l'",
    ]);
    if (out !== updatesPoll.peek()) setUpdates(out);
    scheduleRefresh(NORMAL_INTERVAL_MS);
  } catch (error) {
    console.error(error);
    scheduleRefresh(RETRY_INTERVAL_MS);
  }
}

export function refreshUpdates(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  clearRefreshTimer();
  refreshPromise = runRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

void refreshUpdates();
