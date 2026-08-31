import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {clockTime} from '@/stores/system/time';
import {
  formatWorldClockLocationDetails,
  formatWorldClockOffset,
  formatWorldClockTime,
} from '@/widget/date-weather/utils';

export interface WorldClockRowProps {
  label: string;
  timeZone: string;
}

export default function WorldClockRow({label, timeZone}: WorldClockRowProps) {
  return (
    <box orientation={Gtk.Orientation.HORIZONTAL} halign={Gtk.Align.FILL}>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={scaleUiSize(2)} hexpand>
        <label label={label} halign={Gtk.Align.START} class="world-clock-label" />
        <label
          class="world-clock-details"
          halign={Gtk.Align.START}
          label={clockTime.as(() => formatWorldClockLocationDetails(new Date(), timeZone))}
        />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={scaleUiSize(2)} halign={Gtk.Align.END}>
        <label
          class="world-clock-time"
          halign={Gtk.Align.END}
          label={clockTime.as(() => formatWorldClockTime(new Date(), timeZone))}
        />
        <label
          class="world-clock-details"
          halign={Gtk.Align.END}
          label={clockTime.as(() => formatWorldClockOffset(new Date(), timeZone))}
        />
      </box>
    </box>
  );
}
