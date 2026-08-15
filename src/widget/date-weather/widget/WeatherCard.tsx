import { Gtk } from 'ags/gtk4';

import { LOCATION, getWeatherIcon, weatherInfo } from '../../../stores/system/weather';
import { LucideIcon } from '../../../widget/common/lucide';
import ForecastItem from './ForecastItem';

export default function WeatherCard() {
  return (
    <box
      class="weather-card widget-card"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
      hexpand
      valign={Gtk.Align.CENTER}
    >
      {/* Current conditions */}
      <box spacing={16} halign={Gtk.Align.FILL}>
        <LucideIcon
          name={weatherInfo.as((w) => (w ? getWeatherIcon(w.code) : 'cloud'))}
          pixelSize={48}
          class="weather-icon"
          halign={Gtk.Align.START}
        />
        <box
          orientation={Gtk.Orientation.VERTICAL}
          valign={Gtk.Align.CENTER}
          hexpand
          halign={Gtk.Align.CENTER}
        >
          <label
            label={weatherInfo.as((w) => (w ? `${w.temp}°C` : '--'))}
            class="weather-temp"
            halign={Gtk.Align.CENTER}
          />
          <label
            label={weatherInfo.as((w) => (w ? w.desc : 'Loading...'))}
            class="weather-desc"
            halign={Gtk.Align.CENTER}
          />
        </box>
        <label
          label={weatherInfo.as((w) => (w ? w.region : LOCATION))}
          class="weather-region"
          halign={Gtk.Align.END}
          valign={Gtk.Align.CENTER}
        />
      </box>

      {/* Additional info */}
      <box spacing={24} class="weather-info" halign={Gtk.Align.CENTER}>
        <box spacing={6}>
          <LucideIcon name="wind" pixelSize={16} class="weather-info-icon" />
          <label label={weatherInfo.as((w) => (w ? `${w.wind} km/h` : '--'))} />
        </box>
        <box spacing={6}>
          <LucideIcon name="droplets" pixelSize={16} class="weather-info-icon" />
          <label label={weatherInfo.as((w) => (w ? `${w.humidity}%` : '--'))} />
        </box>
      </box>

      {/* 2-Day Forecast */}
      <box
        class="weather-forecast"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={16}
        homogeneous
      >
        <ForecastItem index={0} />
        <ForecastItem index={1} />
      </box>
    </box>
  );
}
