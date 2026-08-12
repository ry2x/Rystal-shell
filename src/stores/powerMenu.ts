import { execAsync } from 'ags/process';

import GLib from 'gi://GLib';

export type PowerAction = 'shutdown' | 'reboot' | 'logout' | 'sleep' | 'lock';

export async function executePowerAction(action: PowerAction) {
  switch (action) {
    case 'shutdown':
      await execAsync(['systemctl', 'poweroff']);
      break;
    case 'reboot':
      await execAsync(['systemctl', 'reboot']);
      break;
    case 'logout': {
      const sessionId = GLib.getenv('XDG_SESSION_ID');
      if (!sessionId) throw new Error('XDG_SESSION_ID is not set');
      await execAsync(['loginctl', 'kill-session', sessionId]);
      break;
    }
    case 'sleep':
      await execAsync(['loginctl', 'lock-session']);
      await execAsync(['systemctl', 'suspend']);
      break;
    case 'lock':
      await execAsync(['loginctl', 'lock-session']);
      break;
  }
}
