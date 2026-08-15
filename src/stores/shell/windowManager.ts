import { Astal } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import Hyprland from 'gi://AstalHyprland';

export type SidePanel = 'control-center' | 'date-weather' | 'wallpaper-selector' | 'power-menu';

export interface ActiveSidePanel {
  panel: SidePanel | '';
  monitor: string;
}

const activeSidePanelCallbacks: ((value: ActiveSidePanel) => void)[] = [];
let activeSidePanelValue: ActiveSidePanel = { panel: '', monitor: '' };

function setActiveSidePanel(value: ActiveSidePanel) {
  activeSidePanelValue = value;
  activeSidePanelCallbacks.forEach((callback) => callback(value));
}

export const activeSidePanel = {
  get() {
    return activeSidePanelValue;
  },
  subscribe(callback: (value: ActiveSidePanel) => void) {
    activeSidePanelCallbacks.push(callback);
    callback(activeSidePanelValue);
    return () => {
      const index = activeSidePanelCallbacks.indexOf(callback);
      if (index !== -1) activeSidePanelCallbacks.splice(index, 1);
    };
  },
};

export function activateSidePanel(panel: SidePanel, monitor: string) {
  setActiveSidePanel({ panel, monitor });
}

export function deactivateSidePanel(panel: SidePanel, monitor?: string | null) {
  const active = activeSidePanel.get();
  if (active.panel !== panel) return;
  if (monitor !== undefined && monitor !== null && active.monitor !== monitor) return;
  setActiveSidePanel({ panel: '', monitor: '' });
}

type AnimatedWindow = Astal.Window & {
  hide_animated?: () => void;
  show_animated?: () => void;
};

export function focusWindow(className: string) {
  Hyprland.get_default().dispatch('focuswindow', `class:^(${className})$`);
}

export function closeAllControlCenters() {
  app.get_monitors().forEach((m) => {
    const cc = app.get_window(`control-center-${m.get_connector()}`) as AnimatedWindow;
    if (cc && cc.get_visible()) {
      if (cc.hide_animated) cc.hide_animated();
      else cc.set_visible(false);
    }
  });
  deactivateSidePanel('control-center');
}

function closeAllDateWeathers() {
  app.get_monitors().forEach((m) => {
    const dw = app.get_window(`date-weather-popup-${m.get_connector()}`) as AnimatedWindow;
    if (dw && dw.get_visible()) {
      if (dw.hide_animated) dw.hide_animated();
      else dw.set_visible(false);
    }
  });
  deactivateSidePanel('date-weather');
}

function closeAllAppLaunchers() {
  app.get_monitors().forEach((m) => {
    const al = app.get_window(`applauncher-${m.get_connector()}`);
    if (al) al.set_visible(false);
  });
}

function closeAllWallpaperSelectors() {
  app.get_monitors().forEach((m) => {
    const selector = app.get_window(`wallpaper-selector-${m.get_connector()}`) as AnimatedWindow;
    if (selector?.get_visible()) {
      if (selector.hide_animated) selector.hide_animated();
      else selector.set_visible(false);
    }
  });
  deactivateSidePanel('wallpaper-selector');
}

function closeAllPowerMenus() {
  app.get_monitors().forEach((m) => {
    const menu = app.get_window(`power-menu-${m.get_connector()}`) as AnimatedWindow;
    if (menu?.get_visible()) {
      if (menu.hide_animated) menu.hide_animated();
      else menu.set_visible(false);
    }
  });
  deactivateSidePanel('power-menu');
}

export function toggleControlCenter(monitorName?: string | null) {
  const targetMonitor = monitorName || Hyprland.get_default().get_focused_monitor().name;
  app.get_monitors().forEach((m) => {
    const connector = m.get_connector();
    const cc = app.get_window(`control-center-${connector}`) as AnimatedWindow;
    const dw = app.get_window(`date-weather-popup-${connector}`) as AnimatedWindow;
    if (cc) {
      if (connector === targetMonitor) {
        const isActive =
          activeSidePanel.get().panel === 'control-center' &&
          activeSidePanel.get().monitor === connector;
        if (isActive) {
          cc.hide_animated?.();
        } else {
          closeAllWallpaperSelectors();
          closeAllPowerMenus();
          closeAllAppLaunchers();
          if (dw && dw.get_visible()) dw.hide_animated?.();
          cc.show_animated?.();
          activateSidePanel('control-center', connector ?? '');
        }
      } else {
        if (cc.get_visible()) cc.hide_animated?.();
      }
    }
  });
}

export function toggleDateWeather(monitorName?: string | null) {
  const targetMonitor = monitorName || Hyprland.get_default().get_focused_monitor().name;
  app.get_monitors().forEach((m) => {
    const connector = m.get_connector();
    const dw = app.get_window(`date-weather-popup-${connector}`) as AnimatedWindow;
    const cc = app.get_window(`control-center-${connector}`) as AnimatedWindow;
    if (dw) {
      if (connector === targetMonitor) {
        const isActive =
          activeSidePanel.get().panel === 'date-weather' &&
          activeSidePanel.get().monitor === connector;
        if (isActive) {
          dw.hide_animated?.();
        } else {
          closeAllWallpaperSelectors();
          closeAllPowerMenus();
          closeAllAppLaunchers();
          if (cc && cc.get_visible()) cc.hide_animated?.();
          dw.show_animated?.();
          activateSidePanel('date-weather', connector ?? '');
        }
      } else {
        if (dw.get_visible()) dw.hide_animated?.();
      }
    }
  });
}

export function toggleAppLauncher(monitorName?: string | null) {
  const targetMonitor = monitorName || Hyprland.get_default().get_focused_monitor().name;
  app.get_monitors().forEach((m) => {
    const al = app.get_window(`applauncher-${m.get_connector()}`);
    if (al) {
      if (m.get_connector() === targetMonitor) {
        const show = !al.get_visible();
        if (show) {
          closeAllControlCenters();
          closeAllDateWeathers();
          closeAllWallpaperSelectors();
          closeAllPowerMenus();
        }
        al.set_visible(show);
      } else {
        al.set_visible(false);
      }
    }
  });
}

export function toggleWallpaperSelector(monitorName?: string | null) {
  const targetMonitor = monitorName || Hyprland.get_default().get_focused_monitor().name;
  app.get_monitors().forEach((m) => {
    const connector = m.get_connector();
    const selector = app.get_window(`wallpaper-selector-${connector}`) as AnimatedWindow;
    if (!selector) return;

    if (connector === targetMonitor) {
      const isActive =
        activeSidePanel.get().panel === 'wallpaper-selector' &&
        activeSidePanel.get().monitor === connector;
      if (isActive) {
        selector.hide_animated?.();
      } else {
        closeAllControlCenters();
        closeAllDateWeathers();
        closeAllAppLaunchers();
        closeAllPowerMenus();
        selector.show_animated?.();
        activateSidePanel('wallpaper-selector', connector ?? '');
      }
    } else if (selector.get_visible()) {
      selector.hide_animated?.();
    }
  });
}

export function togglePowerMenu(monitorName?: string | null) {
  const targetMonitor = monitorName || Hyprland.get_default().get_focused_monitor().name;
  app.get_monitors().forEach((m) => {
    const connector = m.get_connector();
    const menu = app.get_window(`power-menu-${connector}`) as AnimatedWindow;
    if (!menu) return;

    if (connector === targetMonitor) {
      const isActive =
        activeSidePanel.get().panel === 'power-menu' && activeSidePanel.get().monitor === connector;
      if (isActive) {
        menu.hide_animated?.();
      } else {
        closeAllControlCenters();
        closeAllDateWeathers();
        closeAllWallpaperSelectors();
        closeAllAppLaunchers();
        menu.show_animated?.();
        activateSidePanel('power-menu', connector ?? '');
      }
    } else if (menu.get_visible()) {
      menu.hide_animated?.();
    }
  });
}
