import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {clockDate, clockDay, clockTime, clockTz} from '@/stores/system/time';

export interface ClockCardProps {
  uiScale: UiScaleContext;
}
export default function ClockCard({uiScale}: ClockCardProps) {
  return (
    <box
      class="clock-card widget-card"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={uiScale.size(8)}
      valign={Gtk.Align.CENTER}
      hexpand
    >
      <box halign={Gtk.Align.FILL} valign={Gtk.Align.CENTER}>
        <box hexpand />
        <label label={clockTime} class="clock-time" />
        <box hexpand valign={Gtk.Align.END} halign={Gtk.Align.START}>
          <label label={clockTz} class="clock-tz" />
        </box>
      </box>
      <box spacing={uiScale.size(8)} halign={Gtk.Align.CENTER}>
        <label label={clockDay} class="clock-day" />
        <label label="•" class="clock-dot" />
        <label label={clockDate} class="clock-date" />
      </box>
    </box>
  );
}
