import {For} from 'ags';

import Wp from 'gi://AstalWp';

import {type UiScaleContext} from '@/lib/uiScale';
import {defaultSpeaker} from '@/stores/system/audio';
import VolumeSliderContent from '@/widget/control-center/widget/VolumeSliderContent';

export interface VolumeSliderProps {
  onOpenSound: () => void;
  uiScale: UiScaleContext;
}

export default function VolumeSlider({onOpenSound, uiScale}: VolumeSliderProps) {
  return (
    <box hexpand>
      <For each={defaultSpeaker.as(speaker => (speaker ? [speaker] : []))}>
        {(speaker: Wp.Endpoint) => (
          <VolumeSliderContent speaker={speaker} onOpenSound={onOpenSound} uiScale={uiScale} />
        )}
      </For>
    </box>
  );
}
