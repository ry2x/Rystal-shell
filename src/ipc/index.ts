import {handleBrightness} from './brightness';
import {handleReloadCss} from './css';
import {notificationCommandHandlers} from './notifications';
import {panelCommandHandlers} from './panels';
import {handlePowerProfile} from './powerProfile';
import {handleRecord} from './recording';
import {type IpcCommandHandler, type ResponseCallback} from './types';

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
