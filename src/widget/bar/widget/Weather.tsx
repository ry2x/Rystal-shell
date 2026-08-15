import { Gdk, Gtk } from 'ags/gtk4';

import { getWeatherIcon, weatherInfo } from '../../../stores/weather';
import { toggleDateWeather } from '../../../stores/windowManager';
import { LucideIcon } from '../../../widget/common/lucide';

export interface WeatherProps {
  monitor: Gdk.Monitor;
}

export default function Weather({ monitor }: WeatherProps) {
  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      transitionDuration={250}
      revealChild={weatherInfo.as((w) => w !== null)}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <button class="Weather" onClicked={() => toggleDateWeather(monitor.get_connector())}>
          <box spacing={0} orientation={Gtk.Orientation.VERTICAL}>
            <LucideIcon
              name={weatherInfo.as((w) => (w ? getWeatherIcon(w.code) : 'cloud'))}
              class="icon"
              css="margin-bottom: 4px;"
            />
            <label label={weatherInfo.as((w) => (w ? `${w.temp}` : ''))} css="font-weight: 800;" />
            <label
              label={weatherInfo.as((w) => (w ? '°C' : ''))}
              css="font-size: 0.85em; font-weight: 800;"
            />
          </box>
        </button>
      </box>
    </revealer>
  );
}
