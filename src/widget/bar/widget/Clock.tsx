import { Gdk, Gtk } from 'ags/gtk4';

import { clockTime, shortDate, shortDay } from '../../../stores/time';
import { toggleDateWeather } from '../../../stores/windowManager';

export interface ClockProps {
  monitor: Gdk.Monitor;
}

export default function Clock({ monitor }: ClockProps) {
  const toggleMenu = () => {
    toggleDateWeather(monitor.get_connector());
  };

  return (
    <button class="Clock" onClicked={toggleMenu}>
      <box spacing={0} orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
        <box marginTop={20} marginBottom={20} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <label class="date" label={shortDate} valign={Gtk.Align.CENTER} />
        </box>

        <box marginTop={14} marginBottom={14} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <label class="day" label={shortDay} valign={Gtk.Align.CENTER} />
        </box>

        <box marginTop={22} marginBottom={22} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <label class="time" label={clockTime} valign={Gtk.Align.CENTER} />
        </box>
      </box>
    </button>
  );
}
