import {Gdk, Gtk} from 'ags/gtk4';

import {toggleDateWeather} from '@/stores/shell/windowManager';
import {getWeatherIcon, weatherInfo} from '@/stores/system/weather';
import {LucideIcon} from '@/widget/common/lucide';

export interface WeatherProps {
  monitor: Gdk.Monitor;
}

export default function Weather({monitor}: WeatherProps) {
  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      transitionDuration={250}
      revealChild={weatherInfo.as(w => w !== null)}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <button class="Weather" onClicked={() => toggleDateWeather(monitor.get_connector())}>
          <box spacing={0} orientation={Gtk.Orientation.VERTICAL}>
            <LucideIcon
              name={weatherInfo.as(w => (w ? getWeatherIcon(w.code) : 'cloud'))}
              class="icon bar-weather-icon"
            />
            <label label={weatherInfo.as(w => (w ? `${w.temp}` : ''))} class="bar-weather-value" />
            <label label={weatherInfo.as(w => (w ? '°C' : ''))} class="bar-weather-unit" />
          </box>
        </button>
      </box>
    </revealer>
  );
}
