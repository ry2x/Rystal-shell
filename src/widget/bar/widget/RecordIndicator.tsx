import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {isRecording, stopRecord} from '@/stores/capture/recording';
import {LucideIcon} from '@/widget/common/lucide';

export interface RecordIndicatorProps {
  uiScale: UiScaleContext;
}
export default function RecordIndicator({uiScale}: RecordIndicatorProps) {
  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
      transitionDuration={250}
      revealChild={isRecording}
    >
      <button class="RecordIndicator" onClicked={() => stopRecord()} tooltipText="Stop Recording">
        <box class="record-indicator-content">
          <LucideIcon name="circle-stop" pixelSize={18} uiScale={uiScale} />
        </box>
      </button>
    </revealer>
  );
}
