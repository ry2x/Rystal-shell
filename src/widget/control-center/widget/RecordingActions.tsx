import { Gtk } from 'ags/gtk4';

import { isRecording, stopRecord } from '../../../stores/recording';
import { beginRecording } from '../../../stores/screenCapture';
import { LucideIcon } from '../../../widget/common/lucide';

export default function RecordingActions() {
  const idleBox = (
    <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} homogeneous>
      <button
        class="power-btn"
        onClicked={() => beginRecording('slurp')}
        tooltipText="Record Region"
      >
        <box spacing={8} halign={Gtk.Align.CENTER}>
          <LucideIcon name="focus" pixelSize={18} class="color-secondary" />
          <label label="Region" css="font-size: 0.9em;" />
        </box>
      </button>
      <button
        class="power-btn"
        onClicked={() => beginRecording('monitor')}
        tooltipText="Record Monitor"
      >
        <box spacing={8} halign={Gtk.Align.CENTER}>
          <LucideIcon name="monitor-play" pixelSize={18} class="color-tertiary" />
          <label label="Monitor" css="font-size: 0.9em;" />
        </box>
      </button>
    </box>
  ) as Gtk.Box;

  const recordingBox = (
    <box>
      <button class="power-btn active-record" onClicked={stopRecord} hexpand>
        <box spacing={8} halign={Gtk.Align.CENTER}>
          <LucideIcon name="circle-stop" pixelSize={18} />
          <label label="Stop Recording" css="font-weight: 700; font-size: 0.9em;" />
        </box>
      </button>
    </box>
  ) as Gtk.Box;

  return (
    <>
      <box spacing={8} css="margin-top: 8px;" halign={Gtk.Align.START}>
        <LucideIcon name="clapperboard" pixelSize={20} class="color-primary" />
        <label label="Screen Record" css="font-weight: 700; font-size: 1.1em;" />
      </box>
      <stack
        transitionType={Gtk.StackTransitionType.CROSSFADE}
        transitionDuration={250}
        visibleChildName={isRecording.as((recording) => (recording ? 'recording' : 'idle'))}
        $={(self: Gtk.Stack) => {
          self.add_named(idleBox, 'idle');
          self.add_named(recordingBox, 'recording');
        }}
      />
    </>
  );
}
