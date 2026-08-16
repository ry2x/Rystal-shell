import {reloadLauncherBackground} from '../stores/application/launcherBackground';
import {compileAndReloadCss} from '../stores/shell/style';
import {type IpcCommandHandler} from './types';

export const handleReloadCss: IpcCommandHandler = (_args, response) => {
  compileAndReloadCss()
    .then(reloaded => {
      if (reloaded) reloadLauncherBackground();
      response('CSS Reloaded Successfully');
    })
    .catch(error => response(`Error: ${String(error)}`));
};
