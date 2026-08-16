import Network from 'gi://AstalNetwork';

type NetworkService = ReturnType<typeof Network.get_default>;
type Connection = NetworkService['client']['connections'][number];

export interface WifiProfileDuplicate {
  id: string;
  connection: Connection;
}

type Wifi = Network.Wifi;
type AccessPoint = Network.AccessPoint;

function ssidForConnection(connection: WifiProfileDuplicate['connection']) {
  const bytes = connection.get_setting_wireless()?.ssid?.get_data();
  return bytes ? new TextDecoder().decode(bytes) : null;
}

function matchingConnections(network: NetworkService, ssid: string) {
  return network.client.connections.filter(connection => ssidForConnection(connection) === ssid);
}

function preferredConnection(network: NetworkService, ssid: string) {
  const connections = matchingConnections(network, ssid);
  return (
    connections.find(connection => connection.get_id() === ssid) ??
    connections.find(connection => !/\s\d+$/.test(connection.get_id() ?? '')) ??
    connections[0]
  );
}

function commit(connection: WifiProfileDuplicate['connection']) {
  return new Promise<void>((resolve, reject) => {
    try {
      connection.commit_changes_async(true, null, (_source, result) => {
        try {
          connection.commit_changes_finish(result);
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

function activate(
  network: NetworkService,
  wifi: Wifi,
  connection: WifiProfileDuplicate['connection'],
  ap: AccessPoint
) {
  return new Promise<void>((resolve, reject) => {
    try {
      network.client.activate_connection_async(
        connection,
        wifi.device,
        ap.get_path(),
        null,
        (_source, result) => {
          try {
            network.client.activate_connection_finish(result);
            resolve();
          } catch (reason) {
            reject(reason);
          }
        }
      );
    } catch (reason) {
      reject(reason);
    }
  });
}

async function saveBssid(connection: Connection, ap: AccessPoint) {
  const wireless = connection.get_setting_wireless();
  if (!wireless || !ap.bssid) throw new Error('The selected access point has no BSSID');
  wireless.bssid = ap.bssid;
  await commit(connection);
}

function waitForProfile(
  network: NetworkService,
  ssid: string,
  attempt = 0
): Promise<Connection | undefined> {
  const connection = preferredConnection(network, ssid);
  if (connection) return Promise.resolve(connection);
  if (attempt >= 9) return Promise.resolve(undefined);
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(waitForProfile(network, ssid, attempt + 1));
    }, 100);
  });
}

export function listWifiAccessPoints(wifi: Wifi) {
  const byBssid = new Map<string, AccessPoint>();
  for (const ap of wifi.access_points ?? []) {
    const key = ap.bssid || `unknown:${ap.ssid}:${ap.strength}`;
    byBssid.set(key, ap);
  }
  return [...byBssid.values()].sort((a, b) => b.strength - a.strength);
}

export function getWifiProfileDuplicates(
  network: NetworkService,
  ap: AccessPoint
): WifiProfileDuplicate[] {
  if (!ap.ssid) return [];
  const preferred = preferredConnection(network, ap.ssid);
  return matchingConnections(network, ap.ssid)
    .filter(connection => connection !== preferred)
    .map(connection => ({id: connection.get_id() || 'Unnamed connection', connection}));
}

export function hasWifiProfile(network: NetworkService, ap: AccessPoint) {
  return Boolean(ap.ssid && preferredConnection(network, ap.ssid));
}

export async function deleteWifiProfiles(duplicates: WifiProfileDuplicate[]) {
  await Promise.all(
    duplicates.map(
      duplicate =>
        new Promise<void>((resolve, reject) => {
          try {
            duplicate.connection.delete_async(null, (_source, result) => {
              try {
                duplicate.connection.delete_finish(result);
                resolve();
              } catch (reason) {
                reject(reason);
              }
            });
          } catch (reason) {
            reject(reason);
          }
        })
    )
  );
}

export async function connectWifi(
  network: NetworkService,
  wifi: Wifi,
  ap: AccessPoint,
  password?: string
) {
  const connection = ap.ssid ? preferredConnection(network, ap.ssid) : undefined;
  if (!connection) {
    if (ap.requires_password && !password) throw new Error('Password required');
    await new Promise<void>((resolve, reject) => {
      try {
        ap.activate(password ?? null, (_source, result) => {
          try {
            ap.activate_finish(result);
            resolve();
          } catch (reason) {
            reject(reason);
          }
        });
      } catch (reason) {
        reject(reason);
      }
    });
    if (ap.ssid) {
      const createdConnection = await waitForProfile(network, ap.ssid);
      if (createdConnection) await saveBssid(createdConnection, ap);
    }
    return;
  }

  await saveBssid(connection, ap);
  await activate(network, wifi, connection, ap);
}
