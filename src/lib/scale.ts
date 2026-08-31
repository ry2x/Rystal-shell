export function scaleValue(value: number, scale: number): number {
  return value * scale;
}

export function scaleSize(value: number, scale: number): number {
  return Math.round(scaleValue(value, scale));
}

type UiScaleFactor = 0.75 | 1 | 1.25 | 1.5 | 2;

interface UiScaleConfig {
  scale: UiScaleFactor;
  monitors: Record<string, {scale: UiScaleFactor}>;
}

export interface UiScaleContext {
  connector: string;
  scale: UiScaleFactor;
  cssClass: string;
  value: (value: number) => number;
  size: (value: number) => number;
}

export function resolveUiScale(connector: string | null, config: UiScaleConfig): UiScaleFactor {
  if (!connector) return config.scale;
  return config.monitors[connector]?.scale ?? config.scale;
}

export function uiScaleClass(scale: UiScaleFactor): string {
  return `ui-scale-${String(Math.round(scale * 100)).padStart(3, '0')}`;
}

export function createUiScaleContext(
  connector: string | null,
  config: UiScaleConfig
): UiScaleContext {
  const scale = resolveUiScale(connector, config);
  return {
    connector: connector ?? '',
    scale,
    cssClass: uiScaleClass(scale),
    value: value => scaleValue(value, scale),
    size: value => scaleSize(value, scale),
  };
}
