import { Gtk } from 'ags/gtk4';

import { isRecording, stopRecord } from '../../../stores/recording';
import { LucideIcon } from '../../../widget/common/lucide';

export default function RecordIndicator() {
  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
      transitionDuration={250}
      revealChild={isRecording}
    >
      <button class="RecordIndicator" onClicked={() => stopRecord()} tooltipText="Stop Recording">
        <box css="padding: 2px 4px;">
          <LucideIcon name="circle-stop" pixelSize={18} />
        </box>
      </button>
    </revealer>
  );
}
