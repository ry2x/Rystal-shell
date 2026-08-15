import { type Accessor, createExternal, createState } from 'ags';
import { type Timer, interval } from 'ags/time';

import GLib from 'gi://GLib';

import { rystalShellConfigDir, rystalShellDataDir } from '../lib/paths';
import { activeSidePanel, setAnimBottomHeight, setAnimDx } from './windowManager';

export interface BarColors {
  surface: string;
  primary: string;
}

export interface BarBackgroundGeometry {
  dx: number;
  bottomHeight: number;
}

const BAR_WIDTH = 47;
const CONTROL_CENTER_WIDTH = 490;
const DATE_WEATHER_WIDTH = 900;
const WALLPAPER_PANEL_HEIGHT = 390;
const POWER_MENU_PANEL_HEIGHT = 350;
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
    let surface = '#191114';
    let primary = '#ffb0ce';

    for (const line of contents.split('\n')) {
      const surfaceMatch = line.trim().match(/^\$surface:\s*(#[0-9a-fA-F]{6})/);
      const primaryMatch = line.trim().match(/^\$primary:\s*(#[0-9a-fA-F]{6})/);
      if (surfaceMatch) surface = surfaceMatch[1];
      if (primaryMatch) primary = primaryMatch[1];
    }

    return { surface, primary };
  } catch (error) {
    console.error(`Failed to read bar colors: ${error}`);
    return { surface: '#191114', primary: '#ffb0ce' };
  }
}

function getTargetGeometry(panel: string, isTargetMonitor: boolean): BarBackgroundGeometry {
  if (!isTargetMonitor) return { dx: BAR_WIDTH, bottomHeight: 0 };

  const dx =
    panel === 'control-center'
      ? BAR_WIDTH + CONTROL_CENTER_WIDTH
      : panel === 'date-weather'
        ? BAR_WIDTH + DATE_WEATHER_WIDTH
        : BAR_WIDTH;
  const bottomHeight =
    panel === 'wallpaper-selector'
      ? WALLPAPER_PANEL_HEIGHT
      : panel === 'power-menu'
        ? POWER_MENU_PANEL_HEIGHT
        : 0;

  return { dx, bottomHeight };
}

const [barColorsState, setBarColors] = createState(readBarColors());
export const barColors = barColorsState;

export function reloadBarColors() {
  setBarColors(readBarColors());
}

export function createBarBackgroundGeometry(
  monitorConnector: string | null,
): Accessor<BarBackgroundGeometry> {
  const initialGeometry = { dx: BAR_WIDTH, bottomHeight: 0 };

  return createExternal(initialGeometry, (setGeometry) => {
    let currentGeometry = initialGeometry;
    let targetGeometry = initialGeometry;
    let animationTimer: Timer | null = null;

    const publishGeometry = (geometry: BarBackgroundGeometry) => {
      const activeMonitor = activeSidePanel.get().monitor;
      if (activeMonitor === monitorConnector || activeMonitor === '') {
        setAnimDx(geometry.dx);
        setAnimBottomHeight(geometry.bottomHeight);
      }
      setGeometry(geometry);
    };

    const animate = () => {
      const horizontalDiff = targetGeometry.dx - currentGeometry.dx;
      const bottomDiff = targetGeometry.bottomHeight - currentGeometry.bottomHeight;

      if (Math.abs(horizontalDiff) < 1 && Math.abs(bottomDiff) < 1) {
        currentGeometry = targetGeometry;
        publishGeometry(currentGeometry);
        animationTimer?.cancel();
        animationTimer = null;
        return;
      }

      currentGeometry = {
        dx: currentGeometry.dx + horizontalDiff * ANIMATION_SPEED,
        bottomHeight: currentGeometry.bottomHeight + bottomDiff * ANIMATION_SPEED,
      };
      publishGeometry(currentGeometry);
    };

    const unsubscribePanel = activeSidePanel.subscribe(({ panel, monitor }) => {
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
