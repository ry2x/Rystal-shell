import { createState } from 'ags';

export interface WifiPasswordRequest {
  monitor: string;
  ssid: string;
  submit: (password: string) => Promise<void>;
}

export const [wifiPasswordRequest, setWifiPasswordRequest] =
  createState<WifiPasswordRequest | null>(null);

export function openWifiPasswordDialog(request: WifiPasswordRequest) {
  setWifiPasswordRequest(request);
}

export function closeWifiPasswordDialog(monitor?: string) {
  const request = wifiPasswordRequest();
  if (!monitor || request?.monitor === monitor) setWifiPasswordRequest(null);
}
