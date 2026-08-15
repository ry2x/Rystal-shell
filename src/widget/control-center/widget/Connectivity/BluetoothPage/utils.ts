export function getBluetoothDeviceDetail(batteryPercentage: number, fallback: string) {
  return batteryPercentage >= 0 ? `${Math.round(batteryPercentage)}% battery` : fallback;
}
