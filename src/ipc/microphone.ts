import {type IpcCommand} from '@/lib/ipcCommand';
import {defaultMicrophone, setMicrophoneMute, toggleMicrophoneMute} from '@/stores/system/audio';

function requireDefaultMicrophone() {
  const microphone = defaultMicrophone.peek();
  if (!microphone) throw new Error('No default microphone is available.');
  return microphone;
}

function formatMicrophone(microphone = requireDefaultMicrophone(), muted = microphone.mute) {
  const percentage = Math.round(microphone.volume * 100);
  return `Microphone: ${percentage}% (${muted ? 'muted' : 'unmuted'})`;
}

const microphoneCommand: IpcCommand = {
  name: 'mic',
  description: 'Get or change the default microphone mute state.',
  defaultSubcommand: 'get',
  subcommands: [
    {
      name: 'get',
      description: 'Show the current microphone volume and mute state.',
      execute: () => formatMicrophone(),
    },
    {
      name: 'mute',
      description: 'Mute the default microphone.',
      execute() {
        const microphone = requireDefaultMicrophone();
        const muted = setMicrophoneMute(microphone, true);
        return formatMicrophone(microphone, muted);
      },
    },
    {
      name: 'unmute',
      description: 'Unmute the default microphone.',
      execute() {
        const microphone = requireDefaultMicrophone();
        const muted = setMicrophoneMute(microphone, false);
        return formatMicrophone(microphone, muted);
      },
    },
    {
      name: 'toggle',
      description: 'Toggle the default microphone mute state.',
      execute() {
        const microphone = requireDefaultMicrophone();
        const muted = toggleMicrophoneMute(microphone);
        return formatMicrophone(microphone, muted);
      },
    },
  ],
};

export const microphoneCommands: readonly IpcCommand[] = [microphoneCommand];
