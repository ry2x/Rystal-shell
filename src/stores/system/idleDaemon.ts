import { type Process, execAsync, subprocess } from 'ags/process';
import { timeout } from 'ags/time';

const IDLE_DAEMONS = ['hypridle', 'swayidle'] as const;
const SIGTERM = 15;
const PROCESS_POLL_INTERVAL_MS = 50;
const PROCESS_POLL_ATTEMPTS = 20;

export type IdleDaemon = (typeof IDLE_DAEMONS)[number];

export interface IdleDaemonAdapter {
  detectRunning(): Promise<IdleDaemon | null>;
  start(daemon: IdleDaemon): Promise<void>;
  stop(daemon: IdleDaemon): Promise<void>;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    timeout(milliseconds, resolve);
  });
}

async function getProcessIds(daemon: IdleDaemon) {
  try {
    const output = await execAsync(['pidof', daemon]);
    return output
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

async function waitForRunningState(daemon: IdleDaemon, expected: boolean) {
  for (let attempt = 0; attempt < PROCESS_POLL_ATTEMPTS; attempt++) {
    // eslint-disable-next-line no-await-in-loop
    if ((await getProcessIds(daemon)).length > 0 === expected) return true;
    // eslint-disable-next-line no-await-in-loop
    await delay(PROCESS_POLL_INTERVAL_MS);
  }
  return false;
}

class ExecOnceIdleDaemonAdapter implements IdleDaemonAdapter {
  private readonly managedProcessIds = new Map<IdleDaemon, Set<number>>();
  private readonly ownedProcesses = new Map<IdleDaemon, Process>();

  async detectRunning() {
    for (const daemon of IDLE_DAEMONS) {
      // eslint-disable-next-line no-await-in-loop
      const processIds = await getProcessIds(daemon);
      if (processIds.length === 0) continue;

      if (!this.ownedProcesses.has(daemon) && !this.managedProcessIds.has(daemon)) {
        this.managedProcessIds.set(daemon, new Set(processIds));
      }
      return daemon;
    }
    return null;
  }

  async start(daemon: IdleDaemon) {
    if ((await getProcessIds(daemon)).length > 0) return;

    const process = subprocess({
      cmd: [daemon],
      out: () => {},
      err: (line) => console.error(`${daemon}: ${line}`),
    });
    this.ownedProcesses.set(daemon, process);
    process.connect('exit', () => {
      if (this.ownedProcesses.get(daemon) === process) this.ownedProcesses.delete(daemon);
    });

    if (await waitForRunningState(daemon, true)) return;

    try {
      process.kill();
    } catch {
      // The failed process may already have exited.
    }
    throw new Error(`Failed to start ${daemon}`);
  }

  async stop(daemon: IdleDaemon) {
    const ownedProcess = this.ownedProcesses.get(daemon);
    if (ownedProcess) {
      try {
        ownedProcess.signal(SIGTERM);
      } catch {
        // Verify the process state below in case it exited concurrently.
      }

      if (!(await waitForRunningState(daemon, false))) {
        try {
          ownedProcess.kill();
        } catch {
          // Verify once more below.
        }
      }
      if (!(await waitForRunningState(daemon, false))) {
        throw new Error(`Failed to stop ${daemon}`);
      }
      return;
    }

    const managedProcessIds = this.managedProcessIds.get(daemon);
    const currentProcessIds = await getProcessIds(daemon);
    if (currentProcessIds.length === 0) return;
    if (!managedProcessIds) {
      throw new Error(`Refusing to stop unowned ${daemon} process`);
    }

    const targets = currentProcessIds.filter((pid) => managedProcessIds.has(pid));
    if (targets.length === 0) {
      throw new Error(`The managed ${daemon} process has changed`);
    }

    await execAsync(['kill', '-TERM', ...targets.map(String)]);
    if (!(await waitForRunningState(daemon, false))) {
      throw new Error(`Failed to stop ${daemon}`);
    }
    this.managedProcessIds.delete(daemon);
  }
}

export const idleDaemonAdapter: IdleDaemonAdapter = new ExecOnceIdleDaemonAdapter();
