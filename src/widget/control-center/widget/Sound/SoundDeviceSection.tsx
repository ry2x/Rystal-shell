import {type Accessor, For} from 'ags';
import {Gtk} from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import {LucideIcon} from '../../../../widget/common/lucide';
import DeviceSelector from './DeviceSelector';
import VolumeControls from './VolumeControls';
import {type SoundDeviceKind} from './types';

export interface SoundDeviceSectionProps {
  title: string;
  icon: string;
  kind: SoundDeviceKind;
  endpoint: Accessor<Wp.Endpoint | null>;
  endpoints: Accessor<Wp.Endpoint[]>;
  unavailableLabel: string;
  onSelect: (endpoint: Wp.Endpoint) => Promise<void>;
}

export default function SoundDeviceSection({
  title,
  icon,
  kind,
  endpoint,
  endpoints,
  unavailableLabel,
  onSelect,
}: SoundDeviceSectionProps) {
  return (
    <>
      <box class="cc-sound-section-header" spacing={8}>
        <LucideIcon name={icon} pixelSize={17} />
        <label label={title} class="cc-section-title" halign={Gtk.Align.START} />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={10} hexpand halign={Gtk.Align.FILL}>
        <For each={endpoint.as(value => (value ? [value] : []))}>
          {(value: Wp.Endpoint) => (
            <box
              orientation={Gtk.Orientation.VERTICAL}
              spacing={10}
              hexpand
              halign={Gtk.Align.FILL}
            >
              <DeviceSelector
                endpoint={value}
                endpoints={endpoints}
                kind={kind}
                onSelect={onSelect}
              />
              <VolumeControls endpoint={value} kind={kind} />
            </box>
          )}
        </For>
      </box>
      <label
        label={unavailableLabel}
        visible={endpoint.as(value => value === null)}
        class="cc-sound-unavailable"
      />
    </>
  );
}
