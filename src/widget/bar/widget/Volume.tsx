import { For } from 'ags';
import { Gdk, Gtk } from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import { defaultSpeaker } from '../../../stores/system/audio';
import { VolumeButton } from './VolumeButton';

export interface VolumeProps {
  monitor: Gdk.Monitor;
}

export default function Volume({ monitor }: VolumeProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
      <For each={defaultSpeaker.as((speaker) => (speaker ? [speaker] : []))}>
        {(speaker: Wp.Endpoint) => <VolumeButton speaker={speaker} monitor={monitor} />}
      </For>
    </box>
  );
}
