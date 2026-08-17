import {handleBrightness} from '@/ipc/brightness';
import {handleReloadCss} from '@/ipc/css';
import {notificationCommandHandlers} from '@/ipc/notifications';
import {panelCommandHandlers} from '@/ipc/panels';
import {handlePowerProfile} from '@/ipc/powerProfile';
import {handleRecord} from '@/ipc/recording';
import {type IpcCommandHandler, type ResponseCallback} from '@/ipc/types';

const commandHandlers: ReadonlyMap<string, IpcCommandHandler> = new Map<string, IpcCommandHandler>([
  ...panelCommandHandlers,
  ...notificationCommandHandlers,
  ['reload-css', handleReloadCss],
  ['power-profile', handlePowerProfile],
  ['record', handleRecord],
  ['brightness', handleBrightness],
]);

export function requestHandler(request: string[], response: ResponseCallback) {
  const [command, ...args] = request;
  const handler = commandHandlers.get(command ?? '');

  if (handler) {
    handler(args, response);
    return;
  }

  response(`Unknown command: ${request.join(' ')}`);
}
