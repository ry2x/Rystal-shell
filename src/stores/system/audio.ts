import {type Accessor, createBinding, createState, onCleanup} from 'ags';
import {execAsync} from 'ags/process';
import {type Timer, timeout} from 'ags/time';

import Wp from 'gi://AstalWp';
import GSound from 'gi://GSound';

import {closeAllControlCenters} from '@/stores/shell/windowManager';

let volumeContext: GSound.Context | null = null;
let lastVolumeSoundAt = 0;
const audio = Wp.get_default().audio;
const DEVICE_REFRESH_DELAY_MS = 150;

export const defaultSpeaker = createBinding(audio, 'default_speaker');

export interface SoundPageState {
  speaker: Accessor<Wp.Endpoint | null>;
  microphone: Accessor<Wp.Endpoint | null>;
  speakers: Accessor<Wp.Endpoint[]>;
  microphones: Accessor<Wp.Endpoint[]>;
  selectSpeaker: (endpoint: Wp.Endpoint) => Promise<void>;
  selectMicrophone: (endpoint: Wp.Endpoint) => Promise<void>;
}

function getVolumeContext() {
  if (volumeContext) return volumeContext;
  const context = new GSound.Context();
  context.init(null);
  volumeContext = context;
  return context;
}

function playVolumeSound() {
  try {
    getVolumeContext().play_simple({'event.id': 'audio-volume-change'}, null);
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

export function setMicrophoneVolume(endpoint: Wp.Endpoint, volume: number) {
  endpoint.volume = Math.max(0, Math.min(1, volume));
}

export function toggleEndpointMute(endpoint: Wp.Endpoint) {
  endpoint.mute = !endpoint.mute;
}

export function adjustVolume(endpoint: Wp.Endpoint, delta: number) {
  setEndpointVolume(endpoint, endpoint.volume + delta);
}

async function setDefaultAudioEndpoint(nodeId: number) {
  await execAsync(['wpctl', 'set-default', String(nodeId)]);
}

export function createSoundPageState(): SoundPageState {
  const [speaker, setSpeaker] = createState<Wp.Endpoint | null>(audio.default_speaker ?? null);
  const [microphone, setMicrophone] = createState<Wp.Endpoint | null>(
    audio.default_microphone ?? null
  );
  const [speakers, setSpeakers] = createState<Wp.Endpoint[]>([...(audio.speakers ?? [])]);
  const [microphones, setMicrophones] = createState<Wp.Endpoint[]>([...(audio.microphones ?? [])]);
  let speakerRefreshTimer: Timer | null = null;
  let microphoneRefreshTimer: Timer | null = null;

  const refreshSpeakers = () => {
    setSpeakers([...(audio.speakers ?? [])]);
    setSpeaker(audio.default_speaker ?? null);
  };

  const refreshMicrophones = () => {
    setMicrophones([...(audio.microphones ?? [])]);
    setMicrophone(audio.default_microphone ?? null);
  };

  const selectSpeaker = async (endpoint: Wp.Endpoint) => {
    await setDefaultAudioEndpoint(endpoint.id);
    setSpeaker(endpoint);
    speakerRefreshTimer?.cancel();
    speakerRefreshTimer = timeout(DEVICE_REFRESH_DELAY_MS, () => {
      speakerRefreshTimer = null;
      refreshSpeakers();
    });
  };

  const selectMicrophone = async (endpoint: Wp.Endpoint) => {
    await setDefaultAudioEndpoint(endpoint.id);
    setMicrophone(endpoint);
    microphoneRefreshTimer?.cancel();
    microphoneRefreshTimer = timeout(DEVICE_REFRESH_DELAY_MS, () => {
      microphoneRefreshTimer = null;
      refreshMicrophones();
    });
  };

  const hooks = [
    audio.connect('notify::default-speaker', refreshSpeakers),
    audio.connect('notify::default-microphone', refreshMicrophones),
    audio.connect('speaker-added', refreshSpeakers),
    audio.connect('speaker-removed', refreshSpeakers),
    audio.connect('microphone-added', refreshMicrophones),
    audio.connect('microphone-removed', refreshMicrophones),
  ];

  onCleanup(() => {
    hooks.forEach(hook => audio.disconnect(hook));
    speakerRefreshTimer?.cancel();
    microphoneRefreshTimer?.cancel();
    speakerRefreshTimer = null;
    microphoneRefreshTimer = null;
  });

  return {speaker, microphone, speakers, microphones, selectSpeaker, selectMicrophone};
}

export function openAudioControl() {
  closeAllControlCenters();
  execAsync('pavucontrol').catch(console.error);
}
