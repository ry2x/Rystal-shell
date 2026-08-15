import { Gtk } from 'ags/gtk4';

import { clockTime } from '../../../stores/time';
import { formatWorldClockDetails, formatWorldClockTime } from '../utils';

export interface WorldClockRowProps {
  label: string;
  timeZone: string;
}

export default function WorldClockRow({ label, timeZone }: WorldClockRowProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.FILL} spacing={2}>
      <box orientation={Gtk.Orientation.HORIZONTAL} halign={Gtk.Align.FILL}>
        <label label={label} halign={Gtk.Align.START} hexpand class="world-clock-label" />
        <label
          halign={Gtk.Align.END}
          css="font-weight: 700; font-size: 1.1em;"
          label={clockTime.as(() => formatWorldClockTime(new Date(), timeZone))}
        />
      </box>
      <label
        halign={Gtk.Align.START}
        css="color: alpha(currentColor, 0.7); font-size: 0.85em;"
        label={clockTime.as(() => formatWorldClockDetails(new Date(), timeZone))}
      />
    </box>
  );
}
