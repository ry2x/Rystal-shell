import {type Accessor, createState, onCleanup} from 'ags';
import {type Timer, timeout} from 'ags/time';

import Bluetooth from 'gi://AstalBluetooth';

const DISCOVERY_DURATION_MS = 15_000;

interface BluetoothDeviceSignalTracker {
  sync: (devices: Bluetooth.Device[]) => void;
  dispose: () => void;
}

function connectBluetoothDevice(device: Bluetooth.Device): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      device.connect_device((_source, result) => {
        try {
          device.connect_device_finish(result);
          resolve();
        } catch (reason) {
          reject(reason);
        }
      });
    } catch (reason) {
      reject(reason);
    }
  });
}

function disconnectBluetoothDevice(device: Bluetooth.Device): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      device.disconnect_device((_source, result) => {
        try {
          device.disconnect_device_finish(result);
          resolve();
        } catch (reason) {
          reject(reason);
        }
      });
    } catch (reason) {
      reject(reason);
    }
  });
}

function createBluetoothDeviceSignalTracker(
  onDeviceChanged: () => void
): BluetoothDeviceSignalTracker {
  const hooks = new Map<Bluetooth.Device, number[]>();

  const disconnectHooks = (device: Bluetooth.Device, signalIds: number[]) => {
    signalIds.forEach(signalId => device.disconnect(signalId));
  };

  const sync = (devices: Bluetooth.Device[]) => {
    const currentDevices = new Set(devices);

    hooks.forEach((signalIds, device) => {
      if (currentDevices.has(device)) return;
      disconnectHooks(device, signalIds);
      hooks.delete(device);
    });

    devices.forEach(device => {
      if (hooks.has(device)) return;
      hooks.set(device, [
        device.connect('notify::connected', onDeviceChanged),
        device.connect('notify::paired', onDeviceChanged),
      ]);
    });
  };

  const dispose = () => {
    hooks.forEach((signalIds, device) => disconnectHooks(device, signalIds));
    hooks.clear();
  };

  return {sync, dispose};
}

export interface BluetoothConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

export interface BluetoothPageState {
  bluetooth: ReturnType<typeof Bluetooth.get_default>;
  adapter: ReturnType<typeof Bluetooth.get_default>['adapter'];
  connectedDevices: Accessor<Bluetooth.Device[]>;
  availableDevices: Accessor<Bluetooth.Device[]>;
  error: Accessor<string>;
  confirmation: Accessor<BluetoothConfirmation | null>;
  discover: () => void;
  connectDevice: (device: Bluetooth.Device) => Promise<void>;
  requestDisconnect: (device: Bluetooth.Device) => void;
  requestForget: (device: Bluetooth.Device) => void;
  clearConfirmation: () => void;
  setError: (message: string) => void;
}

export function createBluetoothPageState(active: Accessor<boolean>): BluetoothPageState {
  const bluetooth = Bluetooth.get_default();
  const adapter = bluetooth.adapter;
  const [devices, setDevices] = createState<Bluetooth.Device[]>(bluetooth.devices ?? []);
  const [error, setError] = createState('');
  const [confirmation, setConfirmation] = createState<BluetoothConfirmation | null>(null);
  const connectedDevices = devices.as(list => list.filter(device => device.connected));
  const availableDevices = devices.as(list =>
    list.filter(device => device.paired && !device.connected)
  );
  let discoveryTimer: Timer | null = null;
  let disposed = false;
  const updateError = (message: string) => {
    if (!disposed) setError(message);
  };
  const refreshDeviceState = () => {
    if (!disposed) setDevices([...(bluetooth.devices ?? [])]);
  };
  const deviceSignalTracker = createBluetoothDeviceSignalTracker(refreshDeviceState);

  const refreshDevices = () => {
    if (disposed) return;
    const currentDevices = [...(bluetooth.devices ?? [])];
    deviceSignalTracker.sync(currentDevices);
    setDevices(currentDevices);
  };

  const stopDiscovery = () => {
    discoveryTimer?.cancel();
    discoveryTimer = null;
    if (!adapter) return;

    try {
      adapter.stop_discovery();
    } catch {
      /* Adapter may already have stopped. */
    }
  };

  const discover = () => {
    if (!adapter) return;

    updateError('');
    stopDiscovery();
    try {
      adapter.start_discovery();
      discoveryTimer = timeout(DISCOVERY_DURATION_MS, () => {
        discoveryTimer = null;
        stopDiscovery();
      });
    } catch (reason) {
      updateError(String(reason));
    }
  };

  const connectDevice = async (device: Bluetooth.Device) => {
    updateError('');
    try {
      await connectBluetoothDevice(device);
      refreshDevices();
    } catch (reason) {
      updateError(String(reason));
    }
  };

  const requestDisconnect = (device: Bluetooth.Device) => {
    if (disposed) return;
    setConfirmation({
      title: 'Disconnect Bluetooth device',
      message: `Disconnect ${device.alias}?`,
      confirmLabel: 'Disconnect',
      onConfirm: async () => {
        await disconnectBluetoothDevice(device);
        refreshDevices();
      },
    });
  };

  const requestForget = (device: Bluetooth.Device) => {
    if (disposed || !adapter) return;
    setConfirmation({
      title: 'Forget Bluetooth device',
      message: `Remove the pairing for ${device.alias}?`,
      confirmLabel: 'Forget',
      onConfirm: async () => {
        adapter.remove_device(device);
        refreshDevices();
      },
    });
  };

  const clearConfirmation = () => {
    if (!disposed) setConfirmation(null);
  };
  const hooks = [
    bluetooth.connect('notify::devices', refreshDevices),
    bluetooth.connect('device-added', refreshDevices),
    bluetooth.connect('device-removed', refreshDevices),
  ];
  const unsubscribeActive = active.subscribe(() => {
    if (active.peek()) discover();
    else stopDiscovery();
  });

  if (active.peek()) discover();
  refreshDevices();

  onCleanup(() => {
    disposed = true;
    hooks.forEach(hook => bluetooth.disconnect(hook));
    deviceSignalTracker.dispose();
    unsubscribeActive();
    stopDiscovery();
  });

  return {
    bluetooth,
    adapter,
    connectedDevices,
    availableDevices,
    error,
    confirmation,
    discover,
    connectDevice,
    requestDisconnect,
    requestForget,
    clearConfirmation,
    setError: updateError,
  };
}
