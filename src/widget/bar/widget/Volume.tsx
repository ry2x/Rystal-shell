import {For} from 'ags';
import {Gdk, Gtk} from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import {type UiScaleContext} from '@/lib/uiScale';
import {defaultSpeaker} from '@/stores/system/audio';
import {VolumeButton} from '@/widget/bar/widget/VolumeButton';

export interface VolumeProps {
  monitor: Gdk.Monitor;
  uiScale: UiScaleContext;
}

export default function Volume({monitor, uiScale}: VolumeProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
      <For each={defaultSpeaker.as(speaker => (speaker ? [speaker] : []))}>
        {(speaker: Wp.Endpoint) => (
          <VolumeButton speaker={speaker} monitor={monitor} uiScale={uiScale} />
        )}
      </For>
    </box>
  );
}
