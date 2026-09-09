import {type IpcCommand, IpcUsageError} from '@/lib/ipcCommand';
import {parsePercentage} from '@/lib/percentage';
import {
  adjustVolume,
  defaultSpeaker,
  setEndpointMute,
  setEndpointVolume,
  toggleEndpointMute,
  volumeStep,
} from '@/stores/system/audio';

function requireDefaultSpeaker() {
  const speaker = defaultSpeaker.peek();
  if (!speaker) throw new Error('No default speaker is available.');
  return speaker;
}

function formatVolume(
  speaker = requireDefaultSpeaker(),
  volume = speaker.volume,
  muted = speaker.mute
) {
  const percentage = Math.round(volume * 100);
  return `Volume: ${percentage}% (${muted ? 'muted' : 'unmuted'})`;
}

const volumeCommand: IpcCommand = {
  name: 'volume',
  description: 'Get or change the default speaker volume.',
  defaultSubcommand: 'get',
  subcommands: [
    {
      name: 'get',
      description: 'Show the current speaker volume and mute state.',
      execute: () => formatVolume(),
    },
    {
      name: 'up',
      description: 'Increase speaker volume by 5%.',
      execute() {
        const speaker = requireDefaultSpeaker();
        const volume = adjustVolume(speaker, volumeStep);
        return formatVolume(speaker, volume);
      },
    },
    {
      name: 'down',
      description: 'Decrease speaker volume by 5%.',
      execute() {
        const speaker = requireDefaultSpeaker();
        const volume = adjustVolume(speaker, -volumeStep);
        return formatVolume(speaker, volume);
      },
    },
    {
      name: 'set',
      description: 'Set speaker volume to a percentage.',
      usage: '<0-100>',
      minArgs: 1,
      maxArgs: 1,
      execute([rawPercentage]) {
        const percentage = parsePercentage(rawPercentage);
        if (percentage === null) throw new IpcUsageError('Volume must be between 0 and 100.');

        const speaker = requireDefaultSpeaker();
        const volume = setEndpointVolume(speaker, percentage / 100);
        return formatVolume(speaker, volume);
      },
    },
    {
      name: 'mute',
      description: 'Mute the default speaker.',
      execute() {
        const speaker = requireDefaultSpeaker();
        const muted = setEndpointMute(speaker, true);
        return formatVolume(speaker, speaker.volume, muted);
      },
    },
    {
      name: 'unmute',
      description: 'Unmute the default speaker.',
      execute() {
        const speaker = requireDefaultSpeaker();
        const muted = setEndpointMute(speaker, false);
        return formatVolume(speaker, speaker.volume, muted);
      },
    },
    {
      name: 'toggle',
      description: 'Toggle the default speaker mute state.',
      execute() {
        const speaker = requireDefaultSpeaker();
        const muted = toggleEndpointMute(speaker);
        return formatVolume(speaker, speaker.volume, muted);
      },
    },
  ],
};

export const volumeCommands: readonly IpcCommand[] = [volumeCommand];
