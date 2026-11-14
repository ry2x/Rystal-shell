import {scaleUi} from '@/lib/uiScale';
import {type BarBackgroundGeometry} from '@/stores/shell/barBackground';

export interface DesktopCutout {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export const frameBorderWidth = scaleUi(3);
const borderInset = frameBorderWidth / 2;
const borderRadius = scaleUi(16);

export function getDesktopCutout(
  width: number,
  height: number,
  {dx, bottomHeight}: BarBackgroundGeometry
): DesktopCutout | null {
  const cutoutWidth = width - dx - frameBorderWidth;
  const cutoutHeight = height - bottomHeight - frameBorderWidth;
  if (cutoutWidth <= 0 || cutoutHeight <= 0) return null;

  return {
    x: dx + borderInset,
    y: borderInset,
    width: cutoutWidth,
    height: cutoutHeight,
    radius: Math.min(borderRadius, cutoutWidth / 2, cutoutHeight / 2),
  };
}
