import { Astal, Gdk, Gtk } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import GLib from 'gi://GLib';

import { createAppLauncherState } from '../../stores/appLauncher';
import { ensureLauncherBackground, registerLauncherBackground } from '../../stores/launcherImage';
import { AppList } from './widget/AppList';
import { SearchInput } from './widget/SearchInput';

function createLauncherBackground() {
  const picture = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canTarget: false,
    canShrink: true,
  });

  picture.set_hexpand(true);
  picture.set_vexpand(true);
  picture.set_halign(Gtk.Align.FILL);
  picture.set_valign(Gtk.Align.FILL);
  picture.set_size_request(1, 1);

  const unregister = registerLauncherBackground(picture);
  picture.connect('destroy', unregister);

  return picture;
}

function resetLauncherState(
  searchInput: Gtk.Entry,
  setText: (text: string) => void,
  setSelectedIndex: (index: number) => void,
) {
  searchInput.set_text('');
  setText('');
  setSelectedIndex(0);
}

function focusLauncher(searchInput: Gtk.Entry, appList: Gtk.ScrolledWindow) {
  ensureLauncherBackground();
  GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
    searchInput.grab_focus();
    appList.get_vadjustment()?.set_value(0);
    return GLib.SOURCE_REMOVE;
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

export default function AppLauncher(monitor: Gdk.Monitor) {
  const { text, setText, selectedIndex, setSelectedIndex, results, setResults } =
    createAppLauncherState();
  const monitorConnector = monitor.get_connector();

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
    setResults,
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
      onNotifyVisible={(self) => {
        if (!self.visible) {
          resetLauncherState(searchInput, setText, setSelectedIndex);
        } else {
          focusLauncher(searchInput, appList);
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

  return win;
}
