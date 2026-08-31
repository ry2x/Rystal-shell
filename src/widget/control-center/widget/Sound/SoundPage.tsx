import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {createSoundPageState, openAudioControl} from '@/stores/system/audio';
import {LucideIcon} from '@/widget/common/lucide';
import SoundDeviceSection from '@/widget/control-center/widget/Sound/SoundDeviceSection';

export interface SoundPageProps {
  onBack: () => void;
  uiScale: UiScaleContext;
}

export function SoundPage({onBack, uiScale}: SoundPageProps) {
  const state = createSoundPageState();

  return (
    <box
      class="cc-sound-page"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={uiScale.size(12)}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <box class="cc-sound-header" spacing={uiScale.size(12)}>
        <button class="icon-btn" onClicked={onBack} tooltipText="Back">
          <LucideIcon name="chevron-left" pixelSize={22} uiScale={uiScale} />
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
        uiScale={uiScale}
      />
      <SoundDeviceSection
        title="Input"
        icon="mic"
        kind="input"
        endpoint={state.microphone}
        endpoints={state.microphones}
        unavailableLabel="No input device available"
        onSelect={state.selectMicrophone}
        uiScale={uiScale}
      />

      <box class="cc-sound-section-header" spacing={uiScale.size(8)}>
        <LucideIcon name="settings" pixelSize={17} uiScale={uiScale} />
        <label label="Advanced" class="cc-section-title" halign={Gtk.Align.START} />
      </box>
      <button
        class="cc-sound-advanced"
        hexpand
        halign={Gtk.Align.FILL}
        onClicked={openAudioControl}
      >
        <box spacing={uiScale.size(12)} hexpand>
          <box orientation={Gtk.Orientation.VERTICAL} hexpand>
            <label label="More Sound Settings" halign={Gtk.Align.START} />
            <label
              label="Open pavucontrol"
              class="cc-sound-advanced-subtitle"
              halign={Gtk.Align.START}
            />
          </box>
          <LucideIcon name="chevron-right" pixelSize={20} uiScale={uiScale} />
        </box>
      </button>
    </box>
  );
}
