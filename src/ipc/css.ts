import {type IpcCommand} from '@/lib/ipcCommand';
import {reloadLauncherImage} from '@/stores/application/launcherPicture';
import {compileAndReloadCss} from '@/stores/shell/style';

export const cssCommands: readonly IpcCommand[] = [
  {
    name: 'reload-css',
    description: 'Compile and reload the shell stylesheet.',
    async execute() {
      const reloaded = await compileAndReloadCss();
      if (reloaded) reloadLauncherImage();
      return 'CSS Reloaded Successfully';
    },
  },
];
