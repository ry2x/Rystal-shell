import { createBinding } from 'ags';
import { execAsync } from 'ags/process';

import Wp from 'gi://AstalWp';
import GSound from 'gi://GSound';

import { closeAllControlCenters } from './windowManager';

let volumeContext: GSound.Context | null = null;
let lastVolumeSoundAt = 0;
const audio = Wp.get_default().audio;

export const defaultSpeaker = createBinding(audio, 'default_speaker');

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

function playVolumeFeedback() {
  const now = Date.now();
  if (now - lastVolumeSoundAt <= 100) return;

  lastVolumeSoundAt = now;
  playVolumeSound();
}

export function setEndpointVolume(endpoint: Wp.Endpoint, volume: number) {
  endpoint.volume = Math.max(0, Math.min(1, volume));
  playVolumeFeedback();
}

export function adjustVolume(endpoint: Wp.Endpoint, delta: number) {
  setEndpointVolume(endpoint, endpoint.volume + delta);
}

export async function setDefaultAudioEndpoint(nodeId: number) {
  await execAsync(['wpctl', 'set-default', String(nodeId)]);
}

export function openAudioControl() {
  closeAllControlCenters();
  execAsync('pavucontrol').catch(console.error);
}
