export function parsePercentage(value: string) {
  if (!/^\d+(?:\.\d+)?%?$/.test(value)) return null;

  const percentage = Number(value.replace(/%$/, ''));
  return percentage >= 0 && percentage <= 100 ? percentage : null;
}
