import {For, onCleanup} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';
import {type Timer, idle} from 'ags/time';

import {createAppLauncherState} from '@/stores/application/appLauncherState';
import AppLauncherContent, {
  type AppLauncherContentHandle,
} from '@/widget/app-launcher/AppLauncherContent';

export interface AppLauncherProps {
  monitor: Gdk.Monitor;
}

export default function AppLauncher({monitor}: AppLauncherProps) {
  const state = createAppLauncherState();
  const monitorConnector = monitor.get_connector();
  let content: AppLauncherContentHandle | null = null;
  let focusTimer: Timer | null = null;
  let window: Astal.Window | null = null;

  onCleanup(() => {
    focusTimer?.cancel();
    focusTimer = null;
  });

  return (
    <window
      $={self => (window = self)}
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
      <Gtk.EventControllerKey
        onKeyPressed={(_, keyval) => {
          if (keyval !== Gdk.KEY_Escape) return false;

          window?.set_visible(false);
          return true;
        }}
      />
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
  );
}
