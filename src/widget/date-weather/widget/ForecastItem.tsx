import {Gtk} from 'ags/gtk4';

import {getWeatherIcon, weatherInfo} from '../../../stores/system/weather';
import {LucideIcon} from '../../common/lucide';

export interface ForecastItemProps {
  index: number;
}

function formatForecastDay(date: string) {
  return new Date(date).toLocaleDateString('en-US', {weekday: 'short'}).toUpperCase();
}

export default function ForecastItem({index}: ForecastItemProps) {
  return (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={12}
      valign={Gtk.Align.CENTER}
      halign={Gtk.Align.CENTER}
    >
      <label
        label={weatherInfo.as(weather => {
          const forecast = weather?.forecast[index];
          return forecast ? formatForecastDay(forecast.date) : '';
        })}
        class="forecast-day"
        halign={Gtk.Align.START}
      />
      <LucideIcon
        name={weatherInfo.as(weather => {
          const forecast = weather?.forecast[index];
          return forecast ? getWeatherIcon(forecast.code) : 'cloud';
        })}
        pixelSize={24}
        class="forecast-icon"
      />
      <box orientation={Gtk.Orientation.VERTICAL} spacing={2} valign={Gtk.Align.CENTER}>
        <label
          label={weatherInfo.as(weather => {
            const forecast = weather?.forecast[index];
            return forecast ? `${forecast.max}°C` : '';
          })}
          class="forecast-max"
          halign={Gtk.Align.START}
        />
        <label
          label={weatherInfo.as(weather => {
            const forecast = weather?.forecast[index];
            return forecast ? `${forecast.min}°C` : '';
          })}
          class="forecast-min"
          halign={Gtk.Align.START}
        />
      </box>
    </box>
  );
}
