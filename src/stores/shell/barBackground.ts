import {type Accessor, createExternal, createState} from 'ags';
import {type Timer, interval} from 'ags/time';

import GLib from 'gi://GLib';

import {rystalShellConfigDir, rystalShellDataDir} from '@/lib/paths';
import {type UiScaleContext} from '@/lib/uiScale';
import {activeSidePanel} from '@/stores/shell/windowManager';

export interface BarColors {
  surface: string;
  primary: string;
}

export interface BarBackgroundGeometry {
  dx: number;
  bottomHeight: number;
}

export const BAR_DESIGN_WIDTH = 50;
export const DATE_WEATHER_PANEL_DESIGN_WIDTH = 900;
const ANIMATION_INTERVAL_MS = 1000 / 60;
const ANIMATION_SPEED = 0.22;
const configuredThemePath = `${rystalShellConfigDir}/theme.scss`;
const defaultThemePath = `${rystalShellDataDir}/styles/default/theme.scss`;

function readBarColors(): BarColors {
  try {
    const themePath = GLib.file_test(configuredThemePath, GLib.FileTest.EXISTS)
      ? configuredThemePath
      : defaultThemePath;
    const [success, bytes] = GLib.file_get_contents(themePath);
    if (!success || !bytes) throw new Error(`Cannot read bar colors: ${themePath}`);

    const contents = new TextDecoder().decode(bytes);

    const surfaceMatch = contents.match(/^\s*\$surface:\s*(#[0-9a-fA-F]{6})/m);
    const primaryMatch = contents.match(/^\s*\$primary:\s*(#[0-9a-fA-F]{6})/m);

    return {
      surface: surfaceMatch ? surfaceMatch[1] : '#191114',
      primary: primaryMatch ? primaryMatch[1] : '#ffb0ce',
    };
  } catch (error) {
    console.error(`Failed to read bar colors: ${error}`);
    return {surface: '#191114', primary: '#ffb0ce'};
  }
}

function getTargetGeometry(
  panel: string,
  isTargetMonitor: boolean,
  uiScale: UiScaleContext
): BarBackgroundGeometry {
  const barWidth = uiScale.size(BAR_DESIGN_WIDTH);
  if (!isTargetMonitor) return {dx: barWidth, bottomHeight: 0};

  const dx =
    panel === 'control-center'
      ? barWidth + uiScale.size(490)
      : panel === 'date-weather'
        ? barWidth + uiScale.size(DATE_WEATHER_PANEL_DESIGN_WIDTH)
        : barWidth;
  const bottomHeight =
    panel === 'wallpaper-selector'
      ? uiScale.size(390)
      : panel === 'power-menu'
        ? uiScale.size(350)
        : 0;

  return {dx, bottomHeight};
}

const [barColorsState, setBarColors] = createState(readBarColors());
export const barColors = barColorsState;

export function reloadBarColors() {
  setBarColors(readBarColors());
}

const monitorGeometries = new Map<string, Accessor<BarBackgroundGeometry>>();

function createMonitorGeometry(uiScale: UiScaleContext): Accessor<BarBackgroundGeometry> {
  const initialGeometry = {dx: uiScale.size(BAR_DESIGN_WIDTH), bottomHeight: 0};

  return createExternal(initialGeometry, setGeometry => {
    let currentGeometry = initialGeometry;
    let targetGeometry = initialGeometry;
    let animationTimer: Timer | null = null;

    const animate = () => {
      const horizontalDiff = targetGeometry.dx - currentGeometry.dx;
      const bottomDiff = targetGeometry.bottomHeight - currentGeometry.bottomHeight;

      if (Math.abs(horizontalDiff) < uiScale.value(1) && Math.abs(bottomDiff) < uiScale.value(1)) {
        currentGeometry = targetGeometry;
        setGeometry(currentGeometry);
        animationTimer?.cancel();
        animationTimer = null;
        return;
      }

      currentGeometry = {
        dx: currentGeometry.dx + horizontalDiff * ANIMATION_SPEED,
        bottomHeight: currentGeometry.bottomHeight + bottomDiff * ANIMATION_SPEED,
      };
      setGeometry(currentGeometry);
    };

    const unsubscribePanel = activeSidePanel.subscribe(({panel, monitor}) => {
      targetGeometry = getTargetGeometry(panel, monitor === uiScale.connector, uiScale);
      animationTimer ??= interval(ANIMATION_INTERVAL_MS, animate);
    });

    return () => {
      unsubscribePanel();
      animationTimer?.cancel();
      animationTimer = null;
    };
  });
}

export function createBarBackgroundGeometry(
  uiScale: UiScaleContext
): Accessor<BarBackgroundGeometry> {
  const key = uiScale.connector;
  const existing = monitorGeometries.get(key);
  if (existing) return existing;

  const geometry = createMonitorGeometry(uiScale);
  monitorGeometries.set(key, geometry);
  return geometry;
}
