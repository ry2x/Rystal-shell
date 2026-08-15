import { compileAndReloadCss } from '../lib/css';
import { reloadLauncherBackground } from '../stores/application/launcherBackground';
import { type IpcCommandHandler } from './types';

export const handleReloadCss: IpcCommandHandler = (_args, response) => {
  compileAndReloadCss()
    .then((reloaded) => {
      if (reloaded) reloadLauncherBackground();
      response('CSS Reloaded Successfully');
    })
    .catch((error) => response(`Error: ${String(error)}`));
};
