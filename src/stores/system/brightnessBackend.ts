import {execAsync} from 'ags/process';

import GLib from 'gi://GLib';

import {appConfig} from '@/lib/config';

export type BrightnessBackend = 'ddcutil' | 'brightnessctl';

const DDC_VCP_BRIGHTNESS = '10';

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parsePercent(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) return clampPercent(Number(match[1]));

  const numeric = Number(value.trim());
  return Number.isFinite(numeric) ? clampPercent(numeric) : null;
}

function hasProgram(name: string) {
  return GLib.find_program_in_path(name) !== null;
}

export class BrightnessBackendController {
  private backend: BrightnessBackend | null = null;
  private ddcBuses: string[] = [];

  get current() {
    return this.backend;
  }

  async resolve() {
    if (this.backend) return this.backend;

    const configured = appConfig.brightness.backend;
    if (configured === 'ddcutil' || configured === 'auto') {
      this.ddcBuses = await this.detectDdcBuses();
      if (this.ddcBuses.length > 0) {
        this.backend = 'ddcutil';
        return this.backend;
      }
      if (configured === 'ddcutil') {
        throw new Error('No DDC/CI-compatible display was detected');
      }
    }

    if (configured === 'brightnessctl' || configured === 'auto') {
      if (hasProgram('brightnessctl')) {
        this.backend = 'brightnessctl';
        return this.backend;
      }
    }

    throw new Error(`Brightness backend '${configured}' is unavailable`);
  }

  async getPercent() {
    const backend = await this.resolve();
    return backend === 'ddcutil' ? this.getDdcBrightness() : this.getBrightnessctlBrightness();
  }

  async applyPercent(percent: number) {
    const backend = await this.resolve();
    if (backend === 'ddcutil') {
      const displays = await Promise.all(
        this.ddcBuses.map(async bus => ({bus, ...(await this.getDdcBrightnessDetails(bus))}))
      );
      await Promise.all(
        displays.map(({bus, maximum}) =>
          execAsync([
            'ddcutil',
            '--bus',
            bus,
            'setvcp',
            DDC_VCP_BRIGHTNESS,
            String(Math.round((percent / 100) * maximum)),
          ])
        )
      );
      return;
    }

    await execAsync(['brightnessctl', 'set', `${percent}%`]);
  }

  reset() {
    this.backend = null;
    this.ddcBuses = [];
  }

  private async detectDdcBuses() {
    if (!hasProgram('ddcutil')) return [];

    try {
      const output = await execAsync(['ddcutil', 'detect']);
      return [...output.matchAll(/I2C bus:\s*\/dev\/i2c-(\d+)/g)].map(match => match[1]);
    } catch (error) {
      console.warn('DDC/CI detection failed:', error);
      return [];
    }
  }

  private async getDdcBrightnessDetails(bus: string) {
    const output = await execAsync([
      'ddcutil',
      '--bus',
      bus,
      'getvcp',
      DDC_VCP_BRIGHTNESS,
      '--terse',
    ]);
    const fields = output.trim().split(/\s+/);
    const current = Number(fields[3]);
    const maximum = Number(fields[4]);
    if (!Number.isFinite(current) || !Number.isFinite(maximum) || maximum <= 0) {
      throw new Error(`Unable to parse DDC/CI brightness: ${output.trim()}`);
    }
    return {current, maximum};
  }

  private async getDdcBrightness() {
    const bus = this.ddcBuses[0];
    if (!bus) throw new Error('No DDC/CI bus is available');
    const {current, maximum} = await this.getDdcBrightnessDetails(bus);
    return clampPercent((current / maximum) * 100);
  }

  private async getBrightnessctlBrightness() {
    const output = await execAsync(['brightnessctl', '-m']);
    const percent = parsePercent(output.split(',')[3] ?? output);
    if (percent === null) throw new Error(`Unable to parse brightnessctl output: ${output.trim()}`);
    return percent;
  }
}

export function clampBrightnessPercent(value: number) {
  return clampPercent(value);
}
