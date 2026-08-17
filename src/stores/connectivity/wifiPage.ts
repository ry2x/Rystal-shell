import {type Accessor, createState, onCleanup} from 'ags';

import Network from 'gi://AstalNetwork';
import GObject from 'gi://GObject';
import NM from 'gi://NM';

import {
  connectWifi,
  deleteWifiProfiles,
  getWifiProfileDuplicates,
  hasWifiProfile,
  listWifiAccessPoints,
} from '@/stores/connectivity/wifi';
import {openWifiPasswordDialog} from '@/stores/connectivity/wifiPasswordDialog';

export interface WifiConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

export interface WifiPageState {
  wifi: Network.Wifi | null;
  activeAccessPoint: Accessor<Network.AccessPoint | null>;
  availableAccessPoints: Accessor<Network.AccessPoint[]>;
  error: Accessor<string>;
  confirmation: Accessor<WifiConfirmation | null>;
  scan: () => void;
  selectAccessPoint: (accessPoint: Network.AccessPoint) => Promise<void>;
  retryPassword: () => void;
  requestDisconnect: (accessPoint: Network.AccessPoint) => void;
  requestForget: (accessPoint: Network.AccessPoint) => void;
  clearConfirmation: () => void;
  setError: (message: string) => void;
}

export function createWifiPageState(monitorConnector: string): WifiPageState {
  const network = Network.get_default();
  const wifi = network.wifi;
  const [accessPoints, setAccessPoints] = createState<Network.AccessPoint[]>(
    wifi?.access_points ?? []
  );
  const [error, setError] = createState('');
  const [confirmation, setConfirmation] = createState<WifiConfirmation | null>(null);
  let retryAccessPoint: Network.AccessPoint | null = null;
  let pendingAccessPoint: Network.AccessPoint | null = null;

  const activeAccessPoint = accessPoints.as(() => wifi?.active_access_point ?? null);
  const availableAccessPoints = accessPoints.as(list =>
    list.filter(accessPoint => accessPoint !== wifi?.active_access_point)
  );

  const refreshAccessPoints = () => {
    if (wifi) setAccessPoints(listWifiAccessPoints(wifi));
  };

  const scan = () => {
    if (!wifi) return;

    setError('');
    try {
      wifi.scan();
      refreshAccessPoints();
    } catch (reason) {
      setError(String(reason));
    }
  };

  const deactivateWifi = () =>
    new Promise<void>((resolve, reject) => {
      if (!wifi) {
        reject(new Error('No Wi-Fi adapter available'));
        return;
      }

      try {
        wifi.deactivate_connection((_source, result) => {
          try {
            wifi.deactivate_connection_finish(result);
            resolve();
          } catch (reason) {
            reject(reason);
          }
        });
      } catch (reason) {
        reject(reason);
      }
    });

  const connect = async (accessPoint: Network.AccessPoint, password?: string) => {
    if (!wifi) return;

    setError('');
    retryAccessPoint = null;
    pendingAccessPoint = accessPoint;
    await connectWifi(network, wifi, accessPoint, password);
    refreshAccessPoints();
  };

  const requestPassword = (accessPoint: Network.AccessPoint) => {
    openWifiPasswordDialog({
      monitor: monitorConnector,
      ssid: accessPoint.ssid || 'network',
      submit: password => connect(accessPoint, password),
    });
  };

  const selectAccessPoint = async (accessPoint: Network.AccessPoint) => {
    try {
      const duplicates = getWifiProfileDuplicates(network, accessPoint);
      if (duplicates.length) {
        setConfirmation({
          title: 'Clean up duplicate Wi-Fi profiles',
          message: `Keep ${accessPoint.ssid || 'this network'} and remove: ${duplicates.map(item => item.id).join(', ')}?`,
          confirmLabel: 'Remove and connect',
          onConfirm: async () => {
            await deleteWifiProfiles(duplicates);
            await connect(accessPoint);
          },
        });
        return;
      }
      if (accessPoint.requires_password && !hasWifiProfile(network, accessPoint)) {
        requestPassword(accessPoint);
        return;
      }
      await connect(accessPoint);
    } catch (reason) {
      pendingAccessPoint = null;
      retryAccessPoint = accessPoint;
      setError(String(reason));
    }
  };

  const retryPassword = () => {
    if (retryAccessPoint) requestPassword(retryAccessPoint);
  };

  const requestDisconnect = (accessPoint: Network.AccessPoint) => {
    setConfirmation({
      title: 'Disconnect Wi-Fi',
      message: `Disconnect from ${accessPoint.ssid || 'this network'}?`,
      confirmLabel: 'Disconnect',
      onConfirm: deactivateWifi,
    });
  };

  const requestForget = (accessPoint: Network.AccessPoint) => {
    if (!wifi) return;
    setConfirmation({
      title: 'Forget Wi-Fi network',
      message: `Remove the saved connection for ${accessPoint.ssid || 'this network'}?`,
      confirmLabel: 'Forget',
      onConfirm: async () => {
        const connection = wifi.active_connection?.connection;
        if (!connection) throw new Error('No saved connection profile was found');
        await deactivateWifi();
        await new Promise<void>((resolve, reject) => {
          connection.delete_async(null, (_source, result) => {
            try {
              connection.delete_finish(result);
              resolve();
            } catch (reason) {
              reject(reason);
            }
          });
        });
        refreshAccessPoints();
      },
    });
  };

  const clearConfirmation = () => setConfirmation(null);
  const hooks = wifi
    ? [
        wifi.connect('notify::access-points', refreshAccessPoints),
        wifi.connect('notify::active-access-point', refreshAccessPoints),
        wifi.connect('access-point-added', refreshAccessPoints),
        wifi.connect('access-point-removed', refreshAccessPoints),
      ]
    : [];
  const deviceHook = wifi
    ? wifi.device.connect('state-changed', (_device, state: NM.DeviceState) => {
        const pending = pendingAccessPoint;
        if (!pending) return;
        if (state === NM.DeviceState.ACTIVATED) {
          pendingAccessPoint = null;
        } else if (state === NM.DeviceState.NEED_AUTH || state === NM.DeviceState.FAILED) {
          pendingAccessPoint = null;
          retryAccessPoint = pending;
          setError(
            `Could not connect to ${pending.ssid || 'this network'}. Enter the password and retry.`
          );
        }
      })
    : null;

  if (wifi) scan();

  onCleanup(() => {
    if (!wifi) return;
    hooks.forEach(hook => wifi.disconnect(hook));
    if (deviceHook !== null) {
      GObject.Object.prototype.disconnect.call(wifi.device, deviceHook);
    }
    pendingAccessPoint = null;
    retryAccessPoint = null;
  });

  return {
    wifi,
    activeAccessPoint,
    availableAccessPoints,
    error,
    confirmation,
    scan,
    selectAccessPoint,
    retryPassword,
    requestDisconnect,
    requestForget,
    clearConfirmation,
    setError,
  };
}
