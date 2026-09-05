import {brightnessCommands} from '@/ipc/brightness';
import {cssCommands} from '@/ipc/css';
import {notificationCommands} from '@/ipc/notifications';
import {panelCommands} from '@/ipc/panels';
import {powerProfileCommands} from '@/ipc/powerProfile';
import {recordingCommands} from '@/ipc/recording';
import {type ResponseCallback} from '@/ipc/types';
import {type IpcCommand, executeIpcRequest} from '@/lib/ipcCommand';
import {rystalShellInstance} from '@/lib/paths';

const commands: readonly IpcCommand[] = [
  ...panelCommands,
  ...notificationCommands,
  ...cssCommands,
  ...powerProfileCommands,
  ...recordingCommands,
  ...brightnessCommands,
];

export function requestHandler(request: string[], response: ResponseCallback) {
  void executeIpcRequest(commands, request, rystalShellInstance).then(response);
}
