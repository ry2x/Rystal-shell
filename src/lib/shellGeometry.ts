import {scaleUiSize} from '@/lib/uiScale';

export const shellGeometry = {
  barWidth: scaleUiSize(50),
  frameBorderWidth: scaleUiSize(3),
  controlCenterWidth: scaleUiSize(490),
  dateWeatherPanelWidth: scaleUiSize(900),
  wallpaperPanelHeight: scaleUiSize(390),
  wallpaperCardWidth: scaleUiSize(384),
  wallpaperCardHeight: scaleUiSize(252),
  powerMenuPanelHeight: scaleUiSize(350),
} as const;
