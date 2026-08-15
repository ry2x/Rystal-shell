import { getPowerProfile, setPowerProfile } from '../stores/system/powerProfile';
import { type IpcCommandHandler } from './types';

export const handlePowerProfile: IpcCommandHandler = (args, response) => {
  const power = getPowerProfile();
  if (!power) {
    response('Error: AstalPowerProfiles not available');
    return;
  }
  if (args[0] === 'get' || !args[0]) {
    response(`Current mode: ${power.activeProfile}`);
  } else if (args[0] === 'set' && args[1]) {
    response(setPowerProfile(args[1]));
  } else {
    response('Usage: ags request "power-profile [get | set <mode>]"');
  }
};
