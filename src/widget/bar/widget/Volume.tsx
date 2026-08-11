import { For, createBinding as bind, createState } from 'ags';
import { Gdk, Gtk } from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import { playVolumeSound } from '../../../stores/audio';
import { toggleControlCenter } from '../../../stores/windowManager';
import { LucideIcon } from '../../../widget/common/lucide';

function VolumeButton({ speaker, gdkmonitor }: { speaker: Wp.Endpoint; gdkmonitor: Gdk.Monitor }) {
  const volIcon = bind(speaker, 'volume_icon').as((icon) => {
    if (icon.includes('muted')) return 'volume-x';
    if (icon.includes('high')) return 'volume-2';
    if (icon.includes('medium')) return 'volume-1';
    if (icon.includes('low')) return 'volume';
    return 'volume-x';
  });

  const toggleMenu = () => {
    toggleControlCenter(gdkmonitor.get_connector());
  };

  const btn = (
    <button class="Volume" onClicked={toggleMenu}>
      <box spacing={4} orientation={Gtk.Orientation.VERTICAL}>
        <LucideIcon name={volIcon} class="icon" />
        <box spacing={0} orientation={Gtk.Orientation.VERTICAL}>
          <label label={bind(speaker, 'volume').as((v) => `${Math.round(v * 100)}`)} />
          <label label="%" css="font-size: 0.85em;" />
        </box>
      </box>
    </button>
  ) as Gtk.Button;

  let lastPlay = 0;
  const playSound = () => {
    const now = Date.now();
    if (now - lastPlay > 100) {
      lastPlay = now;
      playVolumeSound();
    }
  };

  const scroll = new Gtk.EventControllerScroll({
    flags: Gtk.EventControllerScrollFlags.VERTICAL,
  });
  scroll.connect('scroll', (_, dx, dy) => {
    if (dy > 0) {
      speaker.volume = Math.max(0, speaker.volume - 0.05);
      playSound();
    } else if (dy < 0) {
      speaker.volume = Math.min(1, speaker.volume + 0.05);
      playSound();
    }
    return true;
  });
  btn.add_controller(scroll);

  return btn;
}

export default function Volume({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  const audio = Wp.get_default().audio;
  const [speaker, setSpeaker] = createState<Wp.Endpoint | null>(audio.default_speaker ?? null);

  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      hexpand
      halign={Gtk.Align.FILL}
      $={(self: Gtk.Box) => {
        const hook = audio.connect('notify::default-speaker', () =>
          setSpeaker(audio.default_speaker ?? null),
        );
        self.connect('destroy', () => audio.disconnect(hook));
      }}
    >
      <For each={speaker.as((value) => (value ? [value] : []))}>
        {(endpoint: Wp.Endpoint) => <VolumeButton speaker={endpoint} gdkmonitor={gdkmonitor} />}
      </For>
    </box>
  );
}
