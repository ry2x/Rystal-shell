import {type IpcCommandHandler} from '@/ipc/types';
import {clearNotifications, toggleDoNotDisturb} from '@/stores/notification/notification';

export const notificationCommandHandlers: ReadonlyMap<string, IpcCommandHandler> = new Map<
  string,
  IpcCommandHandler
>([
  [
    'toggle-dnd',
    (_args, response) => {
      response(`DND toggled to ${toggleDoNotDisturb()}`);
    },
  ],
  [
    'clear-notifications',
    (_args, response) => {
      clearNotifications();
      response('Cleared Notifications');
    },
  ],
]);
