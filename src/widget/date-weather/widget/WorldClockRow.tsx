import {Gtk} from 'ags/gtk4';

import {clockTime} from '@/stores/system/time';
import {formatWorldClockDetails, formatWorldClockTime} from '@/widget/date-weather/utils';

export interface WorldClockRowProps {
  label: string;
  timeZone: string;
}

export default function WorldClockRow({label, timeZone}: WorldClockRowProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.FILL} spacing={2}>
      <box orientation={Gtk.Orientation.HORIZONTAL} halign={Gtk.Align.FILL}>
        <label label={label} halign={Gtk.Align.START} hexpand class="world-clock-label" />
        <label
          class="world-clock-time"
          halign={Gtk.Align.END}
          label={clockTime.as(() => formatWorldClockTime(new Date(), timeZone))}
        />
      </box>
      <label
        class="world-clock-details"
        halign={Gtk.Align.START}
        label={clockTime.as(() => formatWorldClockDetails(new Date(), timeZone))}
      />
    </box>
  );
}
