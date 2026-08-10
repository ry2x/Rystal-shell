import { createState } from 'ags';
import { Astal } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import Hyprland from 'gi://AstalHyprland';

export const activeSidePanel = {
  value: { panel: '', monitor: '' },
  callbacks: [] as ((val: { panel: string; monitor: string }) => void)[],
  get() {
    return this.value;
  },
  set(panel: string, monitor: string) {
    this.value = { panel, monitor };
    this.callbacks.forEach((cb) => cb(this.value));
  },
  subscribe(cb: (val: { panel: string; monitor: string }) => void) {
    this.callbacks.push(cb);
    cb(this.value);
    return () => {
      const index = this.callbacks.indexOf(cb);
      if (index !== -1) this.callbacks.splice(index, 1);
    };
  },
};

export const [animDx, setAnimDx] = createState<number>(47);
export const setAnimBottomHeight = createState<number>(0)[1];

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
  if (activeSidePanel.get().panel === 'control-center') activeSidePanel.set('', '');
}

function closeAllDateWeathers() {
  app.get_monitors().forEach((m) => {
    const dw = app.get_window(`date-weather-popup-${m.get_connector()}`) as AnimatedWindow;
    if (dw && dw.get_visible()) {
      if (dw.hide_animated) dw.hide_animated();
      else dw.set_visible(false);
    }
  });
  if (activeSidePanel.get().panel === 'date-weather') activeSidePanel.set('', '');
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
  if (activeSidePanel.get().panel === 'wallpaper-selector') activeSidePanel.set('', '');
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
          closeAllAppLaunchers();
          if (dw && dw.get_visible()) dw.hide_animated?.();
          cc.show_animated?.();
          activeSidePanel.set('control-center', connector ?? '');
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
          closeAllAppLaunchers();
          if (cc && cc.get_visible()) cc.hide_animated?.();
          dw.show_animated?.();
          activeSidePanel.set('date-weather', connector ?? '');
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
        selector.show_animated?.();
        activeSidePanel.set('wallpaper-selector', connector ?? '');
      }
    } else if (selector.get_visible()) {
      selector.hide_animated?.();
    }
  });
}
