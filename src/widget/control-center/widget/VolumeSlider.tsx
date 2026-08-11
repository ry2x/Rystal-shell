import { For, createBinding as bind, createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import { playVolumeSound } from '../../../stores/audio';
import { LucideIcon } from '../../../widget/common/lucide';

function Slider({ speaker, onOpenSound }: { speaker: Wp.Endpoint; onOpenSound: () => void }) {
  const volIcon = bind(speaker, 'volume_icon').as((icon) => {
    if (icon.includes('muted')) return 'volume-x';
    if (icon.includes('high')) return 'volume-2';
    if (icon.includes('medium')) return 'volume-1';
    if (icon.includes('low')) return 'volume';
    return 'volume-x';
  });

  let lastPlay = 0;
  const playSound = () => {
    const now = Date.now();
    if (now - lastPlay > 100) {
      lastPlay = now;
      playVolumeSound();
    }
  };

  return (
    <box class="cc-card" spacing={16}>
      <button
        class="icon-btn"
        onClicked={() => (speaker.mute = !speaker.mute)}
        tooltipText="Toggle Mute"
      >
        <LucideIcon name={volIcon} pixelSize={20} />
      </button>

      <slider
        class="volume-slider"
        hexpand
        drawValue={false}
        min={0}
        max={1}
        value={bind(speaker, 'volume')}
        onChangeValue={(_self, _scroll, val: number) => {
          speaker.volume = val;
          playSound();
        }}
      />

      <button
        class="icon-btn"
        css="min-width: 40px; padding: 4px; font-weight: 700; border-radius: 10px;"
        onClicked={onOpenSound}
        tooltipText="Open Sound Controls"
      >
        <label label={bind(speaker, 'volume').as((v) => `${Math.round(v * 100)}%`)} />
      </button>
    </box>
  );
}

export default function VolumeSlider({ onOpenSound }: { onOpenSound: () => void }) {
  const audio = Wp.get_default().audio;
  const [speaker, setSpeaker] = createState<Wp.Endpoint | null>(audio.default_speaker ?? null);

  return (
    <box
      hexpand
      $={(self: Gtk.Box) => {
        const hook = audio.connect('notify::default-speaker', () =>
          setSpeaker(audio.default_speaker ?? null),
        );
        self.connect('destroy', () => audio.disconnect(hook));
      }}
    >
      <For each={speaker.as((value) => (value ? [value] : []))}>
        {(endpoint: Wp.Endpoint) => <Slider speaker={endpoint} onOpenSound={onOpenSound} />}
      </For>
    </box>
  );
}
