import {type IpcCommand, IpcUsageError} from '@/lib/ipcCommand';
import {getPowerProfile, setPowerProfile} from '@/stores/system/powerProfile';

function requirePowerProfile() {
  const power = getPowerProfile();
  if (!power) throw new Error('AstalPowerProfiles not available');
  return power;
}

const powerProfileCommand: IpcCommand = {
  name: 'power-profile',
  description: 'Get or change the active power profile.',
  defaultSubcommand: 'get',
  subcommands: [
    {
      name: 'get',
      description: 'Show the current power profile.',
      execute: () => `Current mode: ${requirePowerProfile().activeProfile}`,
    },
    {
      name: 'set',
      description: 'Set the active power profile.',
      usage: '<mode>',
      minArgs: 1,
      maxArgs: 1,
      execute([mode]) {
        const profiles = requirePowerProfile()
          .get_profiles()
          .map(profile => profile.profile);
        if (!profiles.includes(mode)) {
          throw new IpcUsageError(
            `Invalid power profile "${mode}". Available: ${profiles.join(', ')}.`
          );
        }
        return setPowerProfile(mode);
      },
    },
  ],
};

export const powerProfileCommands: readonly IpcCommand[] = [powerProfileCommand];
