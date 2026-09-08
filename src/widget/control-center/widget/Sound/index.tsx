import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {openAudioControl} from '@/stores/application/externalApps';
import {createSoundPageState} from '@/stores/system/audio';
import {LucideIcon} from '@/widget/common/lucide';
import AdvancedSettingsButton from '@/widget/control-center/widget/AdvancedSettingsButton';
import SoundDeviceSection from '@/widget/control-center/widget/Sound/SoundDeviceSection';

export interface SoundPageProps {
  onBack: () => void;
}

export function SoundPage({onBack}: SoundPageProps) {
  const state = createSoundPageState();

  return (
    <box
      class="cc-sound-page"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={scaleUiSize(12)}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <box class="cc-sound-header" spacing={scaleUiSize(12)}>
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

      <AdvancedSettingsButton
        title="More Sound Settings"
        subtitle="Open pavucontrol"
        onOpen={openAudioControl}
      />
    </box>
  );
}
