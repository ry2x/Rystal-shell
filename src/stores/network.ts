import { execAsync } from 'ags/process';

export function toggleWifi(enabled: boolean) {
  execAsync(['bash', '-c', `nmcli radio wifi ${enabled ? 'off' : 'on'}`]).catch(console.error);
}

export function toggleBluetooth(powered: boolean) {
  execAsync(['bash', '-c', `rfkill ${powered ? 'block' : 'unblock'} bluetooth`]).catch(
    console.error,
  );
}
