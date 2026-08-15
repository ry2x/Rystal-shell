import { compileAndReloadCss } from '../lib/css';
import { type IpcCommandHandler } from './types';

export const handleReloadCss: IpcCommandHandler = (_args, response) => {
  compileAndReloadCss()
    .then(() => response('CSS Reloaded Successfully'))
    .catch((error) => response(`Error: ${String(error)}`));
};
