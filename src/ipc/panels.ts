import app from 'ags/gtk4/app';

import Hyprland from 'gi://AstalHyprland';

import {
  toggleAppLauncher,
  toggleControlCenter,
  toggleDateWeather,
  togglePowerMenu,
  toggleWallpaperSelector,
} from '../stores/shell/windowManager';
import {type IpcCommandHandler} from './types';

export const panelCommandHandlers: ReadonlyMap<string, IpcCommandHandler> = new Map<
  string,
  IpcCommandHandler
>([
  [
    'toggle-notif',
    (_args, response) => {
      toggleDateWeather();
      response('Toggled Notification Center');
    },
  ],
  [
    'toggle-cc',
    (_args, response) => {
      toggleControlCenter();
      response('Toggled Control Center');
    },
  ],
  [
    'toggle-launcher',
    (_args, response) => {
      toggleAppLauncher();
      response('Toggled App Launcher');
    },
  ],
  [
    'toggle-wallpaper',
    (_args, response) => {
      toggleWallpaperSelector();
      response('Toggled Wallpaper Selector');
    },
  ],
  [
    'toggle-power-menu',
    (_args, response) => {
      togglePowerMenu();
      response('Toggled Power Menu');
    },
  ],
  [
    'list-windows',
    (_args, response) => {
      const focusedMonitor = Hyprland.get_default().get_focused_monitor().name;
      const dateWeather = app.get_window(`date-weather-popup-${focusedMonitor}`);
      const windows = app
        .get_windows()
        .map(window => window.name)
        .join(', ');
      response(
        `Focused: ${focusedMonitor} | dw visible: ${dateWeather?.get_visible()} | Windows: ${windows}`
      );
    },
  ],
]);
