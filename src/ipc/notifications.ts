import { clearNotifications, toggleDoNotDisturb } from '../stores/notification';
import { type IpcCommandHandler } from './types';

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
