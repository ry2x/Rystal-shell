import { execAsync } from 'ags/process';

import GSound from 'gi://GSound';

import { closeAllControlCenters } from './windowManager';

let volumeContext: GSound.Context | null = null;

function getVolumeContext() {
  if (volumeContext) return volumeContext;
  const context = new GSound.Context();
  context.init(null);
  volumeContext = context;
  return context;
}

export function playVolumeSound() {
  try {
    getVolumeContext().play_simple({ 'event.id': 'audio-volume-change' }, null);
  } catch (err) {
    volumeContext = null;
    console.error('Failed to play volume sound', err);
  }
}

export async function setDefaultAudioEndpoint(nodeId: number) {
  await execAsync(['wpctl', 'set-default', String(nodeId)]);
}

export function openAudioControl() {
  closeAllControlCenters();
  execAsync('pavucontrol').catch(console.error);
}
