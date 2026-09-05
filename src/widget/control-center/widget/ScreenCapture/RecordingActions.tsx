import {createEffect} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {isRecording, stopRecord} from '@/stores/capture/recording';
import {beginRecording} from '@/stores/capture/screenCapture';
import {LucideIcon} from '@/widget/common/lucide';

export default function RecordingActions() {
  return (
    <>
      <box class="cc-record-header" spacing={scaleUiSize(8)} halign={Gtk.Align.START}>
        <LucideIcon name="clapperboard" pixelSize={20} class="color-primary" />
        <label label="Screen Record" class="cc-capture-title" />
      </box>
      <stack
        transitionType={Gtk.StackTransitionType.CROSSFADE}
        transitionDuration={250}
        $={(self: Gtk.Stack) => {
          createEffect(() => {
            self.set_visible_child_name(isRecording() ? 'recording' : 'idle');
          });
        }}
      >
        <box
          $type="named"
          name="idle"
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={scaleUiSize(8)}
          homogeneous
        >
          <button
            class="power-btn"
            onClicked={() => beginRecording('slurp')}
            tooltipText="Record Region"
          >
            <box spacing={scaleUiSize(8)} halign={Gtk.Align.CENTER}>
              <LucideIcon name="focus" pixelSize={18} class="color-secondary" />
              <label label="Region" class="cc-capture-action" />
            </box>
          </button>
          <button
            class="power-btn"
            onClicked={() => beginRecording('monitor')}
            tooltipText="Record Monitor"
          >
            <box spacing={scaleUiSize(8)} halign={Gtk.Align.CENTER}>
              <LucideIcon name="monitor-play" pixelSize={18} class="color-tertiary" />
              <label label="Monitor" class="cc-capture-action" />
            </box>
          </button>
        </box>
        <box $type="named" name="recording">
          <button class="power-btn active-record" onClicked={stopRecord} hexpand>
            <box spacing={scaleUiSize(8)} halign={Gtk.Align.CENTER}>
              <LucideIcon name="circle-stop" pixelSize={18} />
              <label label="Stop Recording" class="cc-capture-action cc-record-stop-label" />
            </box>
          </button>
        </box>
      </stack>
    </>
  );
}
