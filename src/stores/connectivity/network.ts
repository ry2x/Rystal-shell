import { execAsync } from 'ags/process';

export function toggleWifi(enabled: boolean) {
  execAsync(['nmcli', 'radio', 'wifi', enabled ? 'off' : 'on']).catch(console.error);
}

export function toggleBluetooth(powered: boolean) {
  execAsync(['rfkill', powered ? 'block' : 'unblock', 'bluetooth']).catch(console.error);
}
