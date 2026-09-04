import {type Accessor, createExternal, createState} from 'ags';
import {type Timer, interval} from 'ags/time';

import GLib from 'gi://GLib';

import {rystalShellConfigDir, rystalShellDataDir} from '@/lib/paths';
import {shellGeometry} from '@/lib/shellGeometry';
import {scaleUi} from '@/lib/uiScale';
import {activeSidePanel} from '@/stores/shell/windowManager';

const ANIMATION_INTERVAL_MS = 1000 / 60;
const ANIMATION_SPEED = 0.22;

export interface BarColors {
  surface: string;
  primary: string;
}

export interface BarBackgroundGeometry {
  dx: number;
  bottomHeight: number;
}

function readBarColors(): BarColors {
  const configuredThemePath = `${rystalShellConfigDir}/theme.scss`;
  const defaultThemePath = `${rystalShellDataDir}/styles/default/theme.scss`;
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

function getTargetGeometry(panel: string, isTargetMonitor: boolean): BarBackgroundGeometry {
  if (!isTargetMonitor) return {dx: shellGeometry.barWidth, bottomHeight: 0};

  const dx =
    panel === 'control-center'
      ? shellGeometry.barWidth + shellGeometry.controlCenterWidth
      : panel === 'date-weather'
        ? shellGeometry.barWidth + shellGeometry.dateWeatherPanelWidth
        : shellGeometry.barWidth;
  const bottomHeight =
    panel === 'wallpaper-selector'
      ? shellGeometry.wallpaperPanelHeight
      : panel === 'power-menu'
        ? shellGeometry.powerMenuPanelHeight
        : 0;

  return {dx, bottomHeight};
}

const [barColorsState, setBarColors] = createState(readBarColors());
export const barColors = barColorsState;

export function reloadBarColors() {
  setBarColors(readBarColors());
}

const monitorGeometries = new Map<string, Accessor<BarBackgroundGeometry>>();

function createMonitorGeometry(monitorConnector: string | null): Accessor<BarBackgroundGeometry> {
  const initialGeometry = {dx: shellGeometry.barWidth, bottomHeight: 0};

  return createExternal(initialGeometry, setGeometry => {
    let currentGeometry = initialGeometry;
    let targetGeometry = initialGeometry;
    let animationTimer: Timer | null = null;

    const animate = () => {
      const horizontalDiff = targetGeometry.dx - currentGeometry.dx;
      const bottomDiff = targetGeometry.bottomHeight - currentGeometry.bottomHeight;

      if (Math.abs(horizontalDiff) < scaleUi(1) && Math.abs(bottomDiff) < scaleUi(1)) {
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
      targetGeometry = getTargetGeometry(panel, monitor === monitorConnector);
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
  monitorConnector: string | null
): Accessor<BarBackgroundGeometry> {
  const key = monitorConnector ?? '';
  const existing = monitorGeometries.get(key);
  if (existing) return existing;

  const geometry = createMonitorGeometry(monitorConnector);
  monitorGeometries.set(key, geometry);
  return geometry;
}
