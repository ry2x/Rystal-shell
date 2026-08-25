import {Gtk} from 'ags/gtk4';

import {getWeatherIcon, weatherInfo} from '@/stores/system/weather';
import {LucideIcon} from '@/widget/common/lucide';

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
      spacing={4}
      valign={Gtk.Align.CENTER}
      halign={Gtk.Align.CENTER}
      hexpand
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
        pixelSize={22}
        class="forecast-icon"
      />
      <label
        label={weatherInfo.as(weather => {
          const forecast = weather?.forecast[index];
          return forecast ? `${forecast.max}° / ${forecast.min}°` : '';
        })}
        class="forecast-temps"
        halign={Gtk.Align.START}
      />
    </box>
  );
}
