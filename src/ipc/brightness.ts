import {type IpcCommand, IpcUsageError} from '@/lib/ipcCommand';
import {
  brightnessStep,
  changeBrightness,
  getBrightnessBackend,
  refreshBrightness,
  refreshBrightnessBackend,
  restoreBrightness,
  setTemporaryBrightness,
} from '@/stores/system/brightness';

function parseBrightnessPercent(value: string) {
  if (!/^\d+(?:\.\d+)?%?$/.test(value)) return null;
  const percent = Number(value.replace(/%$/, ''));
  return percent >= 0 && percent <= 100 ? percent : null;
}

const brightnessCommand: IpcCommand = {
  name: 'brightness',
  description: 'Get or change display brightness.',
  defaultSubcommand: 'get',
  subcommands: [
    {
      name: 'get',
      description: 'Show the current brightness and backend.',
      async execute() {
        const [value, backend] = await Promise.all([refreshBrightness(), getBrightnessBackend()]);
        return `Brightness: ${value}% (${backend})`;
      },
    },
    {
      name: 'up',
      description: 'Increase brightness by one configured step.',
      async execute() {
        const value = await changeBrightness(brightnessStep);
        return `Brightness: ${value}%`;
      },
    },
    {
      name: 'down',
      description: 'Decrease brightness by one configured step.',
      async execute() {
        const value = await changeBrightness(-brightnessStep);
        return `Brightness: ${value}%`;
      },
    },
    {
      name: 'set',
      description: 'Temporarily set brightness to a percentage.',
      usage: '<0-100>',
      minArgs: 1,
      maxArgs: 1,
      async execute([rawPercent]) {
        const percent = parseBrightnessPercent(rawPercent);
        if (percent === null) throw new IpcUsageError('Brightness must be between 0 and 100.');
        const value = await setTemporaryBrightness(percent);
        return `Brightness: ${value}%`;
      },
    },
    {
      name: 'restore',
      aliases: ['r'],
      description: 'Restore the brightness saved before a temporary change.',
      async execute() {
        const value = await restoreBrightness();
        return `Brightness restored: ${value}%`;
      },
    },
    {
      name: 'refresh',
      description: 'Refresh the brightness backend and current value.',
      async execute() {
        const value = await refreshBrightnessBackend();
        return `Brightness backend refreshed: ${value}%`;
      },
    },
  ],
};

export const brightnessCommands: readonly IpcCommand[] = [brightnessCommand];
