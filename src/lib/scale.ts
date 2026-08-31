export function scaleValue(value: number, scale: number): number {
  return value * scale;
}

export function scaleSize(value: number, scale: number): number {
  return Math.round(scaleValue(value, scale));
}
