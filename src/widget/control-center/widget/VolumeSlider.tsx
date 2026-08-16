import {For} from 'ags';

import Wp from 'gi://AstalWp';

import {defaultSpeaker} from '../../../stores/system/audio';
import VolumeSliderContent from './VolumeSliderContent';

export interface VolumeSliderProps {
  onOpenSound: () => void;
}

export default function VolumeSlider({onOpenSound}: VolumeSliderProps) {
  return (
    <box hexpand>
      <For each={defaultSpeaker.as(speaker => (speaker ? [speaker] : []))}>
        {(speaker: Wp.Endpoint) => (
          <VolumeSliderContent speaker={speaker} onOpenSound={onOpenSound} />
        )}
      </For>
    </box>
  );
}
