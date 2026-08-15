import { Gtk } from 'ags/gtk4';

import { createSoundPageState, openAudioControl } from '../../../../stores/system/audio';
import { LucideIcon } from '../../../../widget/common/lucide';
import SoundDeviceSection from './SoundDeviceSection';

export interface SoundPageProps {
  onBack: () => void;
}

export function SoundPage({ onBack }: SoundPageProps) {
  const state = createSoundPageState();

  return (
    <box
      class="cc-sound-page"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <box class="cc-sound-header" spacing={12}>
        <button class="icon-btn" onClicked={onBack} tooltipText="Back">
          <LucideIcon name="chevron-left" pixelSize={22} />
        </button>
        <label label="Sound" class="cc-title" hexpand halign={Gtk.Align.START} />
      </box>

      <SoundDeviceSection
        title="Output"
        icon="volume-2"
        kind="output"
        endpoint={state.speaker}
        endpoints={state.speakers}
        unavailableLabel="No output device available"
        onSelect={state.selectSpeaker}
      />
      <SoundDeviceSection
        title="Input"
        icon="mic"
        kind="input"
        endpoint={state.microphone}
        endpoints={state.microphones}
        unavailableLabel="No input device available"
        onSelect={state.selectMicrophone}
      />

      <box class="cc-sound-section-header" spacing={8}>
        <LucideIcon name="settings" pixelSize={17} />
        <label label="Advanced" class="cc-section-title" halign={Gtk.Align.START} />
      </box>
      <button
        class="cc-sound-advanced"
        hexpand
        halign={Gtk.Align.FILL}
        onClicked={openAudioControl}
      >
        <box spacing={12} hexpand>
          <box orientation={Gtk.Orientation.VERTICAL} hexpand>
            <label label="More Sound Settings" halign={Gtk.Align.START} />
            <label
              label="Open pavucontrol"
              class="cc-sound-advanced-subtitle"
              halign={Gtk.Align.START}
            />
          </box>
          <LucideIcon name="chevron-right" pixelSize={20} />
        </box>
      </button>
    </box>
  );
}
