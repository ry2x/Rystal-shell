import { For, createBinding as bind, createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import { getVolumeIcon } from '../../../../lib/audio';
import {
  openAudioControl,
  playVolumeSound,
  setDefaultAudioEndpoint,
} from '../../../../stores/audio';
import { LucideIcon } from '../../../../widget/common/lucide';
import { DeviceSelector } from './DeviceSelector';

function volumeIcon(endpoint: Wp.Endpoint) {
  return bind(endpoint, 'volume_icon').as(getVolumeIcon);
}

function VolumeControls({ endpoint, kind }: { endpoint: Wp.Endpoint; kind: 'output' | 'input' }) {
  let lastPlay = 0;
  const playSound = () => {
    if (kind !== 'output') return;
    const now = Date.now();
    if (now - lastPlay < 100) return;
    lastPlay = now;
    playVolumeSound();
  };
  const icon = kind === 'output' ? volumeIcon(endpoint) : 'mic';

  return (
    <box
      class="cc-sound-controls"
      orientation={Gtk.Orientation.VERTICAL}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <label
        label={kind === 'output' ? 'Volume' : 'Input Volume'}
        class="cc-sound-control-label"
        halign={Gtk.Align.START}
      />
      <box spacing={10}>
        <LucideIcon name={icon} class="cc-sound-volume-icon" pixelSize={19} />
        <slider
          class="volume-slider cc-sound-slider"
          hexpand
          drawValue={false}
          min={0}
          max={1}
          value={bind(endpoint, 'volume')}
          onChangeValue={(_self, _scroll, value: number) => {
            endpoint.volume = value;
            playSound();
          }}
        />
        <label
          label={bind(endpoint, 'volume').as((value) => `${Math.round(value * 100)}%`)}
          class="cc-sound-volume-value"
          widthChars={4}
        />
        <button
          class={bind(endpoint, 'mute').as((muted) =>
            muted ? 'cc-sound-mute-btn muted' : 'cc-sound-mute-btn',
          )}
          tooltipText={bind(endpoint, 'mute').as((muted) => (muted ? 'Unmute' : 'Mute'))}
          onClicked={() => (endpoint.mute = !endpoint.mute)}
        >
          <LucideIcon
            name={
              kind === 'output'
                ? bind(endpoint, 'mute').as((muted) => (muted ? 'volume-x' : 'volume-2'))
                : bind(endpoint, 'mute').as((muted) => (muted ? 'mic-off' : 'mic'))
            }
            pixelSize={19}
          />
        </button>
      </box>
    </box>
  );
}

export function SoundPage({ onBack }: { onBack: () => void }) {
  const audio = Wp.get_default().audio;
  const [speaker, setSpeaker] = createState<Wp.Endpoint | null>(audio.default_speaker ?? null);
  const [microphone, setMicrophone] = createState<Wp.Endpoint | null>(
    audio.default_microphone ?? null,
  );
  const [speakers, setSpeakers] = createState<Wp.Endpoint[]>([...(audio.speakers ?? [])]);
  const [microphones, setMicrophones] = createState<Wp.Endpoint[]>([...(audio.microphones ?? [])]);

  const refreshSpeakers = () => {
    setSpeakers([...(audio.speakers ?? [])]);
    setSpeaker(audio.default_speaker ?? null);
  };
  const refreshMicrophones = () => {
    setMicrophones([...(audio.microphones ?? [])]);
    setMicrophone(audio.default_microphone ?? null);
  };

  return (
    <box
      class="cc-sound-page"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
      hexpand
      halign={Gtk.Align.FILL}
      $={(self: Gtk.Box) => {
        const hooks = [
          audio.connect('notify::default-speaker', refreshSpeakers),
          audio.connect('notify::default-microphone', refreshMicrophones),
          audio.connect('speaker-added', refreshSpeakers),
          audio.connect('speaker-removed', refreshSpeakers),
          audio.connect('microphone-added', refreshMicrophones),
          audio.connect('microphone-removed', refreshMicrophones),
        ];
        self.connect('destroy', () => hooks.forEach((hook) => audio.disconnect(hook)));
      }}
    >
      <box class="cc-sound-header" spacing={12}>
        <button class="icon-btn" onClicked={onBack} tooltipText="Back">
          <LucideIcon name="chevron-left" pixelSize={22} />
        </button>
        <label label="Sound" class="cc-title" hexpand halign={Gtk.Align.START} />
      </box>

      <box class="cc-sound-section-header" spacing={8}>
        <LucideIcon name="volume-2" pixelSize={17} />
        <label label="Output" class="cc-section-title" halign={Gtk.Align.START} />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={10} hexpand halign={Gtk.Align.FILL}>
        <For each={speaker.as((value) => (value ? [value] : []))}>
          {(endpoint: Wp.Endpoint) => (
            <box
              orientation={Gtk.Orientation.VERTICAL}
              spacing={10}
              hexpand
              halign={Gtk.Align.FILL}
            >
              <DeviceSelector
                endpoint={endpoint}
                endpoints={speakers}
                kind="output"
                onSelect={async (selected) => {
                  await setDefaultAudioEndpoint(selected.id);
                  setSpeaker(selected);
                  setTimeout(refreshSpeakers, 150);
                }}
              />
              <VolumeControls endpoint={endpoint} kind="output" />
            </box>
          )}
        </For>
      </box>
      <label
        label="No output device available"
        visible={speaker.as((value) => value === null)}
        class="cc-sound-unavailable"
      />

      <box class="cc-sound-section-header" spacing={8}>
        <LucideIcon name="mic" pixelSize={17} />
        <label label="Input" class="cc-section-title" halign={Gtk.Align.START} />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={10} hexpand halign={Gtk.Align.FILL}>
        <For each={microphone.as((value) => (value ? [value] : []))}>
          {(endpoint: Wp.Endpoint) => (
            <box
              orientation={Gtk.Orientation.VERTICAL}
              spacing={10}
              hexpand
              halign={Gtk.Align.FILL}
            >
              <DeviceSelector
                endpoint={endpoint}
                endpoints={microphones}
                kind="input"
                onSelect={async (selected) => {
                  await setDefaultAudioEndpoint(selected.id);
                  setMicrophone(selected);
                  setTimeout(refreshMicrophones, 150);
                }}
              />
              <VolumeControls endpoint={endpoint} kind="input" />
            </box>
          )}
        </For>
      </box>
      <label
        label="No input device available"
        visible={microphone.as((value) => value === null)}
        class="cc-sound-unavailable"
      />

      <box class="cc-sound-section-header" spacing={8}>
        <LucideIcon name="settings" pixelSize={17} />
        <label label="Advanced" class="cc-section-title" halign={Gtk.Align.START} />
      </box>
      <button
        class="cc-sound-advanced"
        hexpand
        halign={Gtk.Align.FILL}
        onClicked={openAudioControl}
      >
        <box spacing={12} hexpand>
          <box orientation={Gtk.Orientation.VERTICAL} hexpand>
            <label label="More Sound Settings" halign={Gtk.Align.START} />
            <label
              label="Open pavucontrol"
              class="cc-sound-advanced-subtitle"
              halign={Gtk.Align.START}
            />
          </box>
          <LucideIcon name="chevron-right" pixelSize={20} />
        </box>
      </button>
    </box>
  );
}
