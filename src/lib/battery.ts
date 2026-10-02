export interface BatteryData {
  percentage: number;
  state: number;
}

/** Validate properties from UPower's composite DisplayDevice, excluding UPS devices. */
export function parseBatteryProperties(value: unknown): BatteryData | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('Type' in value) || value.Type !== 2) return null;
  if (!('IsPresent' in value) || value.IsPresent !== true) return null;
  if (
    !('Percentage' in value) ||
    typeof value.Percentage !== 'number' ||
    !Number.isFinite(value.Percentage) ||
    value.Percentage < 0 ||
    value.Percentage > 100
  ) {
    return null;
  }

  const state = 'State' in value && typeof value.State === 'number' ? value.State : 0;
  return {percentage: value.Percentage, state};
}

export function getBatteryIcon(battery: BatteryData): string {
  if (battery.state === 1) return 'battery-charging';
  if (battery.state === 4) return 'battery-full';
  if (battery.percentage <= 10) return 'battery-warning';
  if (battery.percentage <= 30) return 'battery-low';
  if (battery.percentage <= 70) return 'battery-medium';
  return 'battery-full';
}

export function getBatteryTooltip(battery: BatteryData): string {
  const states: Record<number, string> = {
    1: 'Charging',
    2: 'Discharging',
    3: 'Empty',
    4: 'Fully charged',
    5: 'Pending charge',
    6: 'Pending discharge',
  };
  return `Battery: ${Math.round(battery.percentage)}% · ${states[battery.state] ?? 'Unknown'}`;
}
