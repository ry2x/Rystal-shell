import { type Accessor, createState, onCleanup } from 'ags';
import { type Timer, timeout } from 'ags/time';

import Bluetooth from 'gi://AstalBluetooth';

const DISCOVERY_DURATION_MS = 15_000;
const CONNECTION_REFRESH_DELAY_MS = 500;

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
  connectDevice: (device: Bluetooth.Device) => void;
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
  const connectedDevices = devices.as((list) => list.filter((device) => device.connected));
  const availableDevices = devices.as((list) =>
    list.filter((device) => device.paired && !device.connected),
  );
  let discoveryTimer: Timer | null = null;
  let connectionRefreshTimer: Timer | null = null;

  const refreshDevices = () => setDevices([...(bluetooth.devices ?? [])]);

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

    setError('');
    stopDiscovery();
    try {
      adapter.start_discovery();
      discoveryTimer = timeout(DISCOVERY_DURATION_MS, () => {
        discoveryTimer = null;
        stopDiscovery();
      });
    } catch (reason) {
      setError(String(reason));
    }
  };

  const connectDevice = (device: Bluetooth.Device) => {
    setError('');
    try {
      device.connect_device(null);
      connectionRefreshTimer?.cancel();
      connectionRefreshTimer = timeout(CONNECTION_REFRESH_DELAY_MS, () => {
        connectionRefreshTimer = null;
        refreshDevices();
      });
    } catch (reason) {
      setError(String(reason));
    }
  };

  const requestDisconnect = (device: Bluetooth.Device) => {
    setConfirmation({
      title: 'Disconnect Bluetooth device',
      message: `Disconnect ${device.alias}?`,
      confirmLabel: 'Disconnect',
      onConfirm: async () => {
        await device.disconnect_device(null);
        refreshDevices();
      },
    });
  };

  const requestForget = (device: Bluetooth.Device) => {
    if (!adapter) return;
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

  const clearConfirmation = () => setConfirmation(null);
  const hooks = adapter
    ? [
        bluetooth.connect('notify::devices', refreshDevices),
        bluetooth.connect('device-added', refreshDevices),
        bluetooth.connect('device-removed', refreshDevices),
      ]
    : [];
  const unsubscribeActive = active.subscribe(() => {
    if (active.peek()) discover();
    else stopDiscovery();
  });

  if (active.peek()) discover();

  onCleanup(() => {
    hooks.forEach((hook) => bluetooth.disconnect(hook));
    unsubscribeActive();
    stopDiscovery();
    connectionRefreshTimer?.cancel();
    connectionRefreshTimer = null;
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
    setError,
  };
}
