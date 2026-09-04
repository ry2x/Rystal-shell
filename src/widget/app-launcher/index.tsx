import {For, onCleanup} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';
import {type Timer, idle} from 'ags/time';

import {createAppLauncherState} from '@/stores/application/appLauncherState';
import AppLauncherContent, {
  type AppLauncherContentHandle,
} from '@/widget/app-launcher/AppLauncherContent';

function addEscapeHandler(window: Astal.Window) {
  const controller = new Gtk.EventControllerKey();
  controller.connect('key-pressed', (_, keyval) => {
    if (keyval !== Gdk.KEY_Escape) return false;

    window.set_visible(false);
    return true;
  });
  window.add_controller(controller);
}

export interface AppLauncherProps {
  monitor: Gdk.Monitor;
}

export default function AppLauncher({monitor}: AppLauncherProps) {
  const state = createAppLauncherState();
  const monitorConnector = monitor.get_connector();
  let content: AppLauncherContentHandle | null = null;
  let focusTimer: Timer | null = null;

  const win = (
    <window
      name={`applauncher-${monitorConnector}`}
      class="AppLauncher"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.EXCLUSIVE}
      application={app}
      visible={false}
      onNotifyVisible={self => {
        focusTimer?.cancel();
        focusTimer = null;

        if (!self.visible) {
          content?.reset();
          return;
        }

        state.loadContent();
        focusTimer = idle(() => {
          focusTimer = null;
          content?.focus();
        });
      }}
    >
      <For each={state.contentLoaded.as(loaded => (loaded ? [true] : []))}>
        {() => (
          <AppLauncherContent
            monitorConnector={monitorConnector}
            state={state}
            register={handle => (content = handle)}
          />
        )}
      </For>
    </window>
  ) as Astal.Window;

  addEscapeHandler(win);
  onCleanup(() => {
    focusTimer?.cancel();
    focusTimer = null;
  });

  return win;
}
