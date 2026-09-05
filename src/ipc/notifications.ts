import {type IpcCommand} from '@/lib/ipcCommand';
import {clearNotifications, toggleDoNotDisturb} from '@/stores/notification/notification';

export const notificationCommands: readonly IpcCommand[] = [
  {
    name: 'toggle-dnd',
    description: 'Toggle do-not-disturb mode.',
    execute: () => `DND toggled to ${toggleDoNotDisturb()}`,
  },
  {
    name: 'clear-notifications',
    description: 'Clear all notifications.',
    execute() {
      clearNotifications();
      return 'Cleared Notifications';
    },
  },
];
