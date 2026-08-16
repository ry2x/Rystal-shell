import {createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import {getVolumeIcon} from '../../../../lib/audio';
import {
  setEndpointVolume,
  setMicrophoneVolume,
  toggleEndpointMute,
} from '../../../../stores/system/audio';
import {LucideIcon} from '../../../../widget/common/lucide';
import {type SoundDeviceKind} from './types';

export interface VolumeControlsProps {
  endpoint: Wp.Endpoint;
  kind: SoundDeviceKind;
}

export default function VolumeControls({endpoint, kind}: VolumeControlsProps) {
  const volume = createBinding(endpoint, 'volume');
  const muted = createBinding(endpoint, 'mute');
  const icon =
    kind === 'output'
      ? createBinding(endpoint, 'volume_icon').as(getVolumeIcon)
      : muted.as(value => (value ? 'mic-off' : 'mic'));

  const setVolume = (value: number) => {
    if (kind === 'output') setEndpointVolume(endpoint, value);
    else setMicrophoneVolume(endpoint, value);
  };

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
          value={volume}
          onChangeValue={(_self, _scroll, value: number) => setVolume(value)}
        />
        <label
          label={volume.as(value => `${Math.round(value * 100)}%`)}
          class="cc-sound-volume-value"
          widthChars={4}
        />
        <button
          class={muted.as(value => (value ? 'cc-sound-mute-btn muted' : 'cc-sound-mute-btn'))}
          tooltipText={muted.as(value => (value ? 'Unmute' : 'Mute'))}
          onClicked={() => toggleEndpointMute(endpoint)}
        >
          <LucideIcon
            name={kind === 'output' ? muted.as(value => (value ? 'volume-x' : 'volume-2')) : icon}
            pixelSize={19}
          />
        </button>
      </box>
    </box>
  );
}
