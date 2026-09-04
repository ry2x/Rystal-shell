import {type IpcCommandHandler} from '@/ipc/types';
import {reloadLauncherImage} from '@/stores/application/launcherPicture';
import {compileAndReloadCss} from '@/stores/shell/style';

export const handleReloadCss: IpcCommandHandler = (_args, response) => {
  compileAndReloadCss()
    .then(reloaded => {
      if (reloaded) reloadLauncherImage();
      response('CSS Reloaded Successfully');
    })
    .catch(error => response(`Error: ${String(error)}`));
};
