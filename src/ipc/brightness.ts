import {type IpcCommandHandler} from '@/ipc/types';
import {
  brightnessStep,
  changeBrightness,
  getBrightnessBackend,
  refreshBrightness,
  refreshBrightnessBackend,
  restoreBrightness,
  setTemporaryBrightness,
} from '@/stores/system/brightness';

function parseBrightnessPercent(value: string | undefined) {
  if (!value || !/^\d+(?:\.\d+)?%?$/.test(value)) return null;
  const percent = Number(value.replace(/%$/, ''));
  return percent >= 0 && percent <= 100 ? percent : null;
}

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
  if (action === 'set') {
    const percent = parseBrightnessPercent(args[1]);
    if (percent === null) {
      response('Usage: ags request "brightness set <0-100>"');
      return;
    }
    setTemporaryBrightness(percent)
      .then(value => response(`Brightness: ${value}%`))
      .catch(error => response(`Error: ${String(error)}`));
    return;
  }
  if (action === 'r' || action === 'restore') {
    restoreBrightness()
      .then(value => response(`Brightness restored: ${value}%`))
      .catch(error => response(`Error: ${String(error)}`));
    return;
  }
  response('Usage: ags request "brightness [get|up|down|set <0-100>|r|refresh]"');
};
