import { createExternal } from 'ags';
import { type Timer, timeout } from 'ags/time';

import GLib from 'gi://GLib?version=2.0';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';

import { appConfig } from '../lib/config';

export const LOCATION = appConfig.weather.location;

const NORMAL_INTERVAL_MS = 30 * 60_000;
const RETRY_INTERVAL_MS = 60_000;
const weatherSession = new Soup.Session();
const textDecoder = new TextDecoder('utf-8');

interface WeatherDescription {
  value: string;
}

interface CurrentCondition {
  temp_C: string;
  FeelsLikeC: string;
  weatherDesc: WeatherDescription[];
  weatherCode: string;
  humidity: string;
  windspeedKmph: string;
}

interface WeatherDay {
  date: string;
  maxtempC: string;
  mintempC: string;
  hourly: { weatherCode: string }[];
}

interface WeatherResponse {
  current_condition?: CurrentCondition[];
  nearest_area?: { region?: WeatherDescription[] }[];
  weather?: WeatherDay[];
}

export interface WeatherForecast {
  date: string;
  max: string;
  min: string;
  code: string;
}

export interface WeatherInfo {
  temp: string;
  feelsLike: string;
  desc: string;
  code: string;
  humidity: string;
  wind: string;
  region: string;
  todayMax: string;
  todayMin: string;
  forecast: WeatherForecast[];
}

function sendAndRead(message: Soup.Message, cancellable: Gio.Cancellable): Promise<GLib.Bytes> {
  return new Promise((resolve, reject) => {
    weatherSession.send_and_read_async(
      message,
      GLib.PRIORITY_DEFAULT,
      cancellable,
      (_session, result) => {
        try {
          resolve(weatherSession.send_and_read_finish(result));
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

const weatherJson = createExternal('{}', (setWeatherJson) => {
  let refreshTimer: Timer | null = null;
  let refreshPromise: Promise<void> | null = null;
  let requestCancellable: Gio.Cancellable | null = null;
  let disposed = false;

  function clearRefreshTimer() {
    refreshTimer?.cancel();
    refreshTimer = null;
  }

  function scheduleRefresh(delay: number) {
    if (disposed) return;
    clearRefreshTimer();
    refreshTimer = timeout(delay, () => {
      refreshTimer = null;
      void refreshWeather();
    });
  }

  async function runRefresh() {
    const url =
      LOCATION === '' ? 'https://wttr.in/?format=j1' : `https://wttr.in/${LOCATION}?format=j1`;
    requestCancellable = new Gio.Cancellable();

    try {
      const message = Soup.Message.new('GET', url);
      const bytes = await sendAndRead(message, requestCancellable);
      if (disposed) return;
      if (message.status_code < 200 || message.status_code >= 300) {
        throw new Error(`Weather fetch failed: ${message.status_code}`);
      }

      const data = bytes.get_data();
      const output = data ? textDecoder.decode(data) : '';
      if (!output.trim()) throw new Error('Empty weather response');
      JSON.parse(output);
      setWeatherJson(output);
      scheduleRefresh(NORMAL_INTERVAL_MS);
    } catch (error) {
      if (disposed) return;
      console.error('Weather fetch failed:', error);
      scheduleRefresh(RETRY_INTERVAL_MS);
    } finally {
      requestCancellable = null;
    }
  }

  function refreshWeather() {
    if (refreshPromise) return refreshPromise;

    clearRefreshTimer();
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  void refreshWeather();
  return () => {
    disposed = true;
    clearRefreshTimer();
    requestCancellable?.cancel();
    requestCancellable = null;
  };
});

function parseWeatherInfo(json: string): WeatherInfo | null {
  try {
    const data = JSON.parse(json) as WeatherResponse;
    const current = data.current_condition?.[0];
    const today = data.weather?.[0];
    if (!current || !today) return null;

    const rawRegion = data.nearest_area?.[0]?.region?.[0]?.value ?? LOCATION;
    // eslint-disable-next-line no-control-regex
    const region = rawRegion.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    return {
      temp: current.temp_C,
      feelsLike: current.FeelsLikeC,
      desc: current.weatherDesc[0]?.value ?? '',
      code: current.weatherCode,
      humidity: current.humidity,
      wind: current.windspeedKmph,
      region,
      todayMax: today.maxtempC,
      todayMin: today.mintempC,
      forecast: (data.weather ?? []).slice(1, 3).map((day) => ({
        date: day.date,
        max: day.maxtempC,
        min: day.mintempC,
        code: day.hourly[4]?.weatherCode ?? '119',
      })),
    };
  } catch {
    return null;
  }
}

// eslint-disable-next-line complexity
export function getWeatherIcon(code: string) {
  const c = parseInt(code);
  if (isNaN(c)) return 'cloud';

  switch (c) {
    case 113:
      return 'sun';
    case 116:
      return 'cloud-sun';
    case 119:
    case 122:
      return 'cloud';
    case 143:
    case 248:
    case 260:
      return 'cloud-fog';
    case 176:
    case 263:
    case 266:
    case 293:
    case 296:
    case 299:
    case 302:
    case 305:
    case 308:
      return 'cloud-rain';
    case 200:
    case 386:
    case 389:
    case 392:
    case 395:
      return 'cloud-lightning';
    case 227:
    case 230:
    case 320:
    case 323:
    case 326:
    case 329:
    case 332:
    case 335:
    case 338:
      return 'snowflake';
    case 179:
    case 182:
    case 185:
    case 281:
    case 284:
    case 311:
    case 314:
    case 317:
    case 350:
    case 362:
    case 365:
    case 368:
    case 371:
    case 374:
    case 377:
      return 'cloud-snow';
    case 353:
    case 356:
    case 359:
      return 'cloud-drizzle';
    default:
      return 'cloud';
  }
}

export const weatherInfo = weatherJson.as(parseWeatherInfo);
