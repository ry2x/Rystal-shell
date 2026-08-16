import {
  brightnessStep,
  changeBrightness,
  getBrightnessBackend,
  refreshBrightness,
  refreshBrightnessBackend,
} from '../stores/system/brightness';
import {type IpcCommandHandler} from './types';

export const handleBrightness: IpcCommandHandler = (args, response) => {
  const action = args[0] ?? 'get';
  if (action === 'up' || action === 'down') {
    const delta = action === 'up' ? brightnessStep : -brightnessStep;
    changeBrightness(delta)
      .then(value => response(`Brightness: ${value}%`))
      .catch(error => response(`Error: ${String(error)}`));
    return;
  }
  if (action === 'get') {
    Promise.all([refreshBrightness(), getBrightnessBackend()])
      .then(([value, backend]) => response(`Brightness: ${value}% (${backend})`))
      .catch(error => response(`Error: ${String(error)}`));
    return;
  }
  if (action === 'refresh') {
    refreshBrightnessBackend()
      .then(value => response(`Brightness backend refreshed: ${value}%`))
      .catch(error => response(`Error: ${String(error)}`));
    return;
  }
  response('Usage: ags request "brightness [get|up|down|refresh]"');
};
