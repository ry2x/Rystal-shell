import {createState} from 'ags';
import {Astal} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import Hyprland from 'gi://AstalHyprland';

export type SidePanel = 'control-center' | 'date-weather' | 'wallpaper-selector' | 'power-menu';

interface ActiveSidePanel {
  panel: SidePanel | '';
  monitor: string;
}

type AnimatedWindow = Astal.Window & {
  hide_animated?: () => void;
  hide_immediately?: () => void;
  show_animated?: () => void;
};

type BeforePanelShow = (connector: string | null) => void;

const sidePanelWindowNames: Record<SidePanel, (connector: string | null) => string> = {
  'control-center': connector => `control-center-${connector}`,
  'date-weather': connector => `date-weather-popup-${connector}`,
  'wallpaper-selector': connector => `wallpaper-selector-${connector}`,
  'power-menu': connector => `power-menu-${connector}`,
};

const [activeSidePanelState, setActiveSidePanel] = createState<ActiveSidePanel>({
  panel: '',
  monitor: '',
});
export const activeSidePanel = activeSidePanelState;

function getTargetMonitor(monitorName?: string | null) {
  return monitorName || Hyprland.get_default().get_focused_monitor().name;
}

function getAnimatedWindow(name: string) {
  return app.get_window(name) as AnimatedWindow | null;
}

function getSidePanelWindow(panel: SidePanel, connector: string | null) {
  return getAnimatedWindow(sidePanelWindowNames[panel](connector));
}

function hideWindow(window: AnimatedWindow, immediately = false) {
  if (immediately) {
    if (window.hide_immediately) window.hide_immediately();
    else window.set_visible(false);
    return;
  }

  if (window.hide_animated) window.hide_animated();
  else window.set_visible(false);
}

function hideSidePanelAt(panel: SidePanel, connector: string | null) {
  const window = getSidePanelWindow(panel, connector);
  if (window?.get_visible()) hideWindow(window);
}

function closeSidePanel(panel: SidePanel, immediately = false) {
  for (const monitor of app.get_monitors()) {
    const window = getSidePanelWindow(panel, monitor.get_connector());
    if (window?.get_visible()) hideWindow(window, immediately);
  }
  deactivateSidePanel(panel);
}

function closeAllDateWeathers() {
  closeSidePanel('date-weather');
}

function closeAllAppLaunchers() {
  for (const monitor of app.get_monitors()) {
    app.get_window(`applauncher-${monitor.get_connector()}`)?.set_visible(false);
  }
}

function closeAllWallpaperSelectors() {
  closeSidePanel('wallpaper-selector');
}

function closeAllPowerMenus() {
  closeSidePanel('power-menu');
}

function isActiveSidePanel(panel: SidePanel, connector: string | null) {
  const active = activeSidePanel.peek();
  return active.panel === panel && active.monitor === connector;
}

function toggleSidePanel(
  panel: SidePanel,
  monitorName: string | null | undefined,
  beforeShow: BeforePanelShow
) {
  const targetMonitor = getTargetMonitor(monitorName);

  for (const monitor of app.get_monitors()) {
    const connector = monitor.get_connector();
    const window = getSidePanelWindow(panel, connector);
    if (!window) continue;

    if (connector !== targetMonitor) {
      if (window.get_visible()) hideWindow(window);
      continue;
    }

    if (isActiveSidePanel(panel, connector)) {
      hideWindow(window);
      continue;
    }

    beforeShow(connector);
    window.show_animated?.();
    activateSidePanel(panel, connector ?? '');
  }
}

export function activateSidePanel(panel: SidePanel, monitor: string) {
  setActiveSidePanel({panel, monitor});
}

export function deactivateSidePanel(panel: SidePanel, monitor?: string | null) {
  const active = activeSidePanel.peek();
  if (active.panel !== panel) return;
  if (monitor !== undefined && monitor !== null && active.monitor !== monitor) return;
  setActiveSidePanel({panel: '', monitor: ''});
}

export function focusWindow(className: string) {
  Hyprland.get_default().dispatch('focuswindow', `class:^(${className})$`);
}

export function closeAllControlCenters() {
  closeSidePanel('control-center');
}

export function closeAllControlCentersImmediately() {
  closeSidePanel('control-center', true);
}

export function toggleControlCenter(monitorName?: string | null) {
  toggleSidePanel('control-center', monitorName, connector => {
    closeAllWallpaperSelectors();
    closeAllPowerMenus();
    closeAllAppLaunchers();
    hideSidePanelAt('date-weather', connector);
  });
}

export function toggleDateWeather(monitorName?: string | null) {
  toggleSidePanel('date-weather', monitorName, connector => {
    closeAllWallpaperSelectors();
    closeAllPowerMenus();
    closeAllAppLaunchers();
    hideSidePanelAt('control-center', connector);
  });
}

export function toggleAppLauncher(monitorName?: string | null) {
  const targetMonitor = getTargetMonitor(monitorName);

  for (const monitor of app.get_monitors()) {
    const connector = monitor.get_connector();
    const launcher = app.get_window(`applauncher-${connector}`);
    if (!launcher) continue;

    if (connector !== targetMonitor) {
      launcher.set_visible(false);
      continue;
    }

    const show = !launcher.get_visible();
    if (show) {
      closeAllControlCenters();
      closeAllDateWeathers();
      closeAllWallpaperSelectors();
      closeAllPowerMenus();
    }
    launcher.set_visible(show);
  }
}

export function toggleWallpaperSelector(monitorName?: string | null) {
  toggleSidePanel('wallpaper-selector', monitorName, () => {
    closeAllControlCenters();
    closeAllDateWeathers();
    closeAllAppLaunchers();
    closeAllPowerMenus();
  });
}

export function togglePowerMenu(monitorName?: string | null) {
  toggleSidePanel('power-menu', monitorName, () => {
    closeAllControlCenters();
    closeAllDateWeathers();
    closeAllWallpaperSelectors();
    closeAllAppLaunchers();
  });
}
