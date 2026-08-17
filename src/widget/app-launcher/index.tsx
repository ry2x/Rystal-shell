import {onCleanup} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';
import {type Timer, idle} from 'ags/time';

import {createAppLauncherState} from '@/stores/application/appLauncher';
import {
  ensureLauncherBackground,
  registerLauncherBackground,
} from '@/stores/application/launcherBackground';
import {AppList} from '@/widget/app-launcher/widget/AppList';
import {SearchInput} from '@/widget/app-launcher/widget/SearchInput';

function createLauncherBackground() {
  const picture = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canTarget: false,
    canShrink: true,
    hexpand: true,
    vexpand: true,
    halign: Gtk.Align.FILL,
    valign: Gtk.Align.FILL,
    widthRequest: 1,
    heightRequest: 1,
  });

  const unregister = registerLauncherBackground(picture);
  picture.connect('destroy', unregister);

  return picture;
}

function resetLauncherState(
  searchInput: Gtk.Entry,
  setText: (text: string) => void,
  setSelectedIndex: (index: number) => void
) {
  searchInput.set_text('');
  setText('');
  setSelectedIndex(0);
}

function focusLauncher(searchInput: Gtk.Entry, appList: Gtk.ScrolledWindow) {
  ensureLauncherBackground();
  return idle(() => {
    searchInput.grab_focus();
    appList.get_vadjustment()?.set_value(0);
  });
}

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
  const {text, setText, selectedIndex, setSelectedIndex, results} = createAppLauncherState();
  const monitorConnector = monitor.get_connector();
  let focusTimer: Timer | null = null;

  const launcherBackground = createLauncherBackground();

  const searchInput = SearchInput({
    text,
    setText,
    selectedIndex,
    setSelectedIndex,
    results,
    monitorConnector,
  });

  const launcherContent = (
    <box orientation={Gtk.Orientation.VERTICAL} vexpand>
      <box vexpand />
      <box class="applauncher-search-container" hexpand>
        {searchInput}
      </box>
    </box>
  ) as Gtk.Box;

  const appList = AppList({
    text,
    selectedIndex,
    results,
    monitorConnector,
  });

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
          resetLauncherState(searchInput, setText, setSelectedIndex);
        } else {
          focusTimer = focusLauncher(searchInput, appList);
        }
      }}
    >
      <box class="applauncher-window" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
        <box class="applauncher-box-wrapper" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          {/* Left Panel */}
          <box
            class="applauncher-left-panel"
            orientation={Gtk.Orientation.VERTICAL}
            vexpand
            overflow={Gtk.Overflow.HIDDEN}
          >
            <overlay
              hexpand
              vexpand
              $={(self: Gtk.Overlay) => {
                self.set_child(launcherBackground);
                self.add_overlay(launcherContent);
              }}
            />
          </box>

          {/* Right Panel */}
          <box
            class="applauncher-right-panel"
            orientation={Gtk.Orientation.VERTICAL}
            hexpand={false}
          >
            {appList}
          </box>
        </box>
      </box>
    </window>
  ) as Astal.Window;

  addEscapeHandler(win);
  onCleanup(() => {
    focusTimer?.cancel();
    focusTimer = null;
  });

  return win;
}
