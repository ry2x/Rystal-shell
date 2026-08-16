import {type Accessor, createState, onCleanup} from 'ags';

export interface WifiPasswordRequest {
  monitor: string;
  ssid: string;
  submit: (password: string) => Promise<void>;
}

export interface WifiPasswordDialogState {
  visible: Accessor<boolean>;
  ssid: Accessor<string>;
  connectLabel: Accessor<string>;
  busy: Accessor<boolean>;
  error: Accessor<string>;
  activation: Accessor<number>;
  submit: (password: string) => Promise<void>;
  close: () => void;
}

const [wifiPasswordRequestState, setWifiPasswordRequest] = createState<WifiPasswordRequest | null>(
  null
);
const wifiPasswordRequest = wifiPasswordRequestState;

export function openWifiPasswordDialog(request: WifiPasswordRequest) {
  setWifiPasswordRequest(request);
}

function closeWifiPasswordDialog(monitor?: string) {
  const request = wifiPasswordRequest.peek();
  if (!monitor || request?.monitor === monitor) setWifiPasswordRequest(null);
}

export function createWifiPasswordDialogState(monitorConnector: string): WifiPasswordDialogState {
  const [busy, setBusy] = createState(false);
  const [error, setError] = createState('');
  const [activation, setActivation] = createState(0);
  const visible = wifiPasswordRequest.as(request => request?.monitor === monitorConnector);
  const ssid = wifiPasswordRequest.as(request => request?.ssid ?? '');
  const connectLabel = wifiPasswordRequest.as(request =>
    request ? `Connect to ${request.ssid}` : 'Connect'
  );

  const unsubscribe = wifiPasswordRequest.subscribe(() => {
    const request = wifiPasswordRequest.peek();
    if (request?.monitor !== monitorConnector) return;

    setBusy(false);
    setError('');
    setActivation(value => value + 1);
  });

  const submit = async (password: string) => {
    const request = wifiPasswordRequest.peek();
    if (!request || request.monitor !== monitorConnector || !password) return;

    setBusy(true);
    setError('');
    try {
      await request.submit(password);
      closeWifiPasswordDialog(monitorConnector);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };

  const close = () => closeWifiPasswordDialog(monitorConnector);

  onCleanup(unsubscribe);

  return {visible, ssid, connectLabel, busy, error, activation, submit, close};
}
