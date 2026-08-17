import {createState} from 'ags';

import GLib from 'gi://GLib?version=2.0';

import {ryprlandRuntimeDir} from '@/lib/paths';
import {type IdleDaemon, idleDaemonAdapter} from '@/stores/system/idleDaemon';

const RUNTIME_DIR = `${ryprlandRuntimeDir}/rystal-shell`;
const CAFFEINE_REMOTE_FILE = `${RUNTIME_DIR}/caffeine-remote`;
export type CaffeineState = 'disabled' | 'enabled' | 'remote';

const [caffeineStateValue, setCaffeineState] = createState<CaffeineState>('disabled');
const [caffeineBusyValue, setCaffeineBusy] = createState(true);
export const caffeineState = caffeineStateValue;
export const caffeineBusy = caffeineBusyValue;

let currentState: CaffeineState = 'disabled';
let activeDaemon: IdleDaemon = 'hypridle';
let pendingOperations = 1;
let initializationFailed = false;

function updateCaffeineState(state: CaffeineState) {
  currentState = state;
  setCaffeineState(state);
}

function startInhibit() {
  GLib.mkdir_with_parents(RUNTIME_DIR, 0o700);
  const fd = GLib.creat(CAFFEINE_REMOTE_FILE, 0o644);
  if (fd === -1) throw new Error(`Failed to create ${CAFFEINE_REMOTE_FILE}`);
  GLib.close(fd);
}

function stopInhibit() {
  if (!GLib.file_test(CAFFEINE_REMOTE_FILE, GLib.FileTest.EXISTS)) return;
  if (GLib.remove(CAFFEINE_REMOTE_FILE) === -1) {
    throw new Error(`Failed to remove ${CAFFEINE_REMOTE_FILE}`);
  }
}

async function readCaffeineState() {
  const runningDaemon = await idleDaemonAdapter.detectRunning();
  if (runningDaemon) activeDaemon = runningDaemon;

  const isInhibitRunning = GLib.file_test(CAFFEINE_REMOTE_FILE, GLib.FileTest.EXISTS);
  if (!runningDaemon) return 'enabled';
  return isInhibitRunning ? 'remote' : 'disabled';
}

async function initializeCaffeine() {
  updateCaffeineState(await readCaffeineState());
}

async function performToggle() {
  if (currentState === 'disabled') {
    await idleDaemonAdapter.stop(activeDaemon);
    stopInhibit();
    updateCaffeineState('enabled');
    return;
  }

  if (currentState === 'enabled') {
    await idleDaemonAdapter.start(activeDaemon);
    startInhibit();
    updateCaffeineState('remote');
    return;
  }

  await idleDaemonAdapter.start(activeDaemon);
  stopInhibit();
  updateCaffeineState('disabled');
}

let operationQueue = initializeCaffeine()
  .catch(error => {
    initializationFailed = true;
    console.error('Failed to initialize caffeine:', error);
  })
  .finally(() => {
    pendingOperations -= 1;
    setCaffeineBusy(initializationFailed || pendingOperations > 0);
  });

export function toggleCaffeine(): Promise<void> {
  if (initializationFailed) {
    return Promise.reject(new Error('Caffeine state could not be initialized'));
  }
  pendingOperations += 1;
  setCaffeineBusy(true);

  const operation = operationQueue.then(performToggle).catch(async error => {
    console.error('Failed to toggle caffeine:', error);
    try {
      updateCaffeineState(await readCaffeineState());
    } catch (refreshError) {
      initializationFailed = true;
      console.error('Failed to refresh caffeine state:', refreshError);
    }
    throw error;
  });

  operationQueue = operation
    .catch(() => {})
    .finally(() => {
      pendingOperations -= 1;
      setCaffeineBusy(initializationFailed || pendingOperations > 0);
    });

  return operation;
}
