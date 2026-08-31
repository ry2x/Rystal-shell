import {Gdk, Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {toggleDateWeather} from '@/stores/shell/windowManager';
import {clockTime, shortDate, shortDay} from '@/stores/system/time';

export interface ClockProps {
  monitor: Gdk.Monitor;
}

export default function Clock({monitor}: ClockProps) {
  const toggleMenu = () => {
    toggleDateWeather(monitor.get_connector());
  };

  return (
    <button class="Clock" onClicked={toggleMenu}>
      <box spacing={0} orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
        <box
          marginTop={scaleUiSize(20)}
          marginBottom={scaleUiSize(20)}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        >
          <label class="date" label={shortDate} valign={Gtk.Align.CENTER} />
        </box>

        <box
          marginTop={scaleUiSize(14)}
          marginBottom={scaleUiSize(14)}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        >
          <label class="day" label={shortDay} valign={Gtk.Align.CENTER} />
        </box>

        <box
          marginTop={scaleUiSize(22)}
          marginBottom={scaleUiSize(22)}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        >
          <label class="time" label={clockTime} valign={Gtk.Align.CENTER} />
        </box>
      </box>
    </button>
  );
}
