import app from 'ags/gtk4/app';

import Hyprland from 'gi://AstalHyprland';

import {type IpcCommand} from '@/lib/ipcCommand';
import {
  toggleAppLauncher,
  toggleControlCenter,
  toggleDateWeather,
  togglePowerMenu,
  toggleWallpaperSelector,
} from '@/stores/shell/windowManager';

export const panelCommands: readonly IpcCommand[] = [
  {
    name: 'toggle-notif',
    description: 'Toggle the notification and weather panel.',
    execute() {
      toggleDateWeather();
      return 'Toggled Notification Center';
    },
  },
  {
    name: 'toggle-cc',
    description: 'Toggle the control center.',
    execute() {
      toggleControlCenter();
      return 'Toggled Control Center';
    },
  },
  {
    name: 'toggle-launcher',
    description: 'Toggle the application launcher.',
    execute() {
      toggleAppLauncher();
      return 'Toggled App Launcher';
    },
  },
  {
    name: 'toggle-wallpaper',
    description: 'Toggle the wallpaper selector.',
    execute() {
      toggleWallpaperSelector();
      return 'Toggled Wallpaper Selector';
    },
  },
  {
    name: 'toggle-power-menu',
    description: 'Toggle the power menu.',
    execute() {
      togglePowerMenu();
      return 'Toggled Power Menu';
    },
  },
  {
    name: 'list-windows',
    description: 'List shell windows and the focused monitor.',
    execute() {
      const focusedMonitor = Hyprland.get_default().get_focused_monitor().name;
      const dateWeather = app.get_window(`date-weather-popup-${focusedMonitor}`);
      const windows = app
        .get_windows()
        .map(window => window.name)
        .join(', ');
      return `Focused: ${focusedMonitor} | dw visible: ${dateWeather?.get_visible()} | Windows: ${windows}`;
    },
  },
];
