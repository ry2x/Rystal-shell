import {Gtk} from 'ags/gtk4';

import {LOCATION, getWeatherIcon, weatherInfo} from '@/stores/system/weather';
import {LucideIcon} from '@/widget/common/lucide';
import ForecastItem from '@/widget/date-weather/widget/ForecastItem';

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
      <box class="weather-current" spacing={8} halign={Gtk.Align.FILL}>
        <box class="weather-primary" spacing={8} valign={Gtk.Align.CENTER} hexpand>
          <LucideIcon
            name={weatherInfo.as(w => (w ? getWeatherIcon(w.code) : 'cloud'))}
            pixelSize={48}
            class="weather-icon"
            halign={Gtk.Align.START}
            valign={Gtk.Align.CENTER}
          />
          <box
            orientation={Gtk.Orientation.VERTICAL}
            valign={Gtk.Align.CENTER}
            hexpand
            halign={Gtk.Align.FILL}
          >
            <label
              label={weatherInfo.as(w => (w ? `${w.temp}°C` : '--'))}
              class="weather-temp"
              halign={Gtk.Align.CENTER}
            />
            <label
              label={weatherInfo.as(w => (w ? w.desc : 'Loading...'))}
              class="weather-desc"
              halign={Gtk.Align.CENTER}
            />
          </box>
        </box>
        <box
          class="weather-range"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={3}
          halign={Gtk.Align.END}
          valign={Gtk.Align.CENTER}
        >
          <label
            label={weatherInfo.as(w => (w ? w.region : LOCATION))}
            class="weather-region"
            halign={Gtk.Align.END}
          />
          <label
            label={weatherInfo.as(w => (w ? `${w.todayMax}°C ↑` : '--'))}
            class="weather-high"
            halign={Gtk.Align.END}
          />
          <label
            label={weatherInfo.as(w => (w ? `${w.todayMin}°C ↓` : '--'))}
            class="weather-low"
            halign={Gtk.Align.END}
          />
        </box>
      </box>

      {/* Additional info */}
      <box spacing={28} class="weather-info" halign={Gtk.Align.CENTER}>
        <box spacing={8}>
          <LucideIcon name="wind" pixelSize={20} class="weather-info-icon" />
          <label label={weatherInfo.as(w => (w ? `${w.wind} km/h` : '--'))} />
        </box>
        <box spacing={8}>
          <LucideIcon name="droplets" pixelSize={20} class="weather-info-icon" />
          <label label={weatherInfo.as(w => (w ? `${w.humidity}%` : '--'))} />
        </box>
      </box>

      {/* 2-Day Forecast */}
      <box class="weather-forecast" orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <ForecastItem index={0} />
        <ForecastItem index={1} />
      </box>
    </box>
  );
}
