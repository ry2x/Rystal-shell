import {createBinding} from 'ags';

import Wp from 'gi://AstalWp';

import {getVolumeIcon} from '@/lib/audio';
import {type UiScaleContext} from '@/lib/uiScale';
import {setEndpointVolume} from '@/stores/system/audio';
import {LucideIcon} from '@/widget/common/lucide';

export interface VolumeSliderContentProps {
  speaker: Wp.Endpoint;
  onOpenSound: () => void;
  uiScale: UiScaleContext;
}

export default function VolumeSliderContent({
  speaker,
  onOpenSound,
  uiScale,
}: VolumeSliderContentProps) {
  const volume = createBinding(speaker, 'volume');
  const volumeIcon = createBinding(speaker, 'volume_icon').as(getVolumeIcon);

  return (
    <box class="cc-card" spacing={uiScale.size(16)}>
      <button
        class="icon-btn"
        onClicked={() => (speaker.mute = !speaker.mute)}
        tooltipText="Toggle Mute"
      >
        <LucideIcon name={volumeIcon} pixelSize={20} uiScale={uiScale} />
      </button>

      <slider
        class="volume-slider"
        hexpand
        drawValue={false}
        min={0}
        max={1}
        value={volume}
        onChangeValue={(_self, _scroll, value: number) => setEndpointVolume(speaker, value)}
      />

      <button
        class="icon-btn cc-value-button"
        onClicked={onOpenSound}
        tooltipText="Open Sound Controls"
      >
        <label label={volume.as(value => `${Math.round(value * 100)}%`)} />
      </button>
    </box>
  );
}
