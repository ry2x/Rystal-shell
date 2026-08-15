import Network from 'gi://AstalNetwork';

export function getAccessPointId(accessPoint: Network.AccessPoint, fallback: string) {
  return accessPoint.bssid || accessPoint.ssid || fallback;
}

export function getSsidLabel(ssid: string | null) {
  return ssid || 'Hidden Network';
}

export function getSignalLabel(accessPoint: Network.AccessPoint, strength: number) {
  return `${accessPoint.bssid || 'Unknown BSSID'} · ${strength}% signal`;
}
