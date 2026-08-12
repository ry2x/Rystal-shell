import type { PowerAction } from '../../stores/powerMenu';

export interface PowerItem {
  action: PowerAction;
  label: string;
  shortcut: string;
  icon: string;
  dangerous?: boolean;
}

export const POWER_ITEMS: PowerItem[] = [
  { action: 'shutdown', label: 'Shutdown', shortcut: 'u', icon: 'power', dangerous: true },
  { action: 'reboot', label: 'Reboot', shortcut: 'r', icon: 'rotate-ccw', dangerous: true },
  { action: 'logout', label: 'Logout', shortcut: 'e', icon: 'log-out', dangerous: true },
  { action: 'sleep', label: 'Sleep', shortcut: 's', icon: 'moon' },
  { action: 'lock', label: 'Lock', shortcut: 'l', icon: 'lock' },
];
