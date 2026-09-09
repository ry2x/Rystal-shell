import {For} from 'ags';

import Wp from 'gi://AstalWp';

import {defaultSpeaker} from '@/stores/system/audio';
import VolumeSliderContent from '@/widget/control-center/widget/VolumeSliderContent';

export interface VolumeSliderProps {
  onOpenSound: () => void;
  monitorConnector: string;
}

export default function VolumeSlider({onOpenSound, monitorConnector}: VolumeSliderProps) {
  return (
    <box hexpand>
      <For each={defaultSpeaker.as(speaker => (speaker ? [speaker] : []))}>
        {(speaker: Wp.Endpoint) => (
          <VolumeSliderContent
            speaker={speaker}
            onOpenSound={onOpenSound}
            monitorConnector={monitorConnector}
          />
        )}
      </For>
    </box>
  );
}
