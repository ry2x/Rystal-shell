import {appConfig} from '@/lib/config';
import {scaleSize, scaleValue} from '@/lib/scale';

export function scaleUi(value: number): number {
  return scaleValue(value, appConfig.ui.scale);
}

export function scaleUiSize(value: number): number {
  return scaleSize(value, appConfig.ui.scale);
}
