import {onCleanup} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';
import {type Timer, idle} from 'ags/time';

import {createAppSearchTextState} from '@/stores/application/appLauncher';
import {ensureLauncherBackground} from '@/stores/application/launcherBackground';

import {AppList} from './widget/AppList';
import {createLauncherBackground} from './widget/LauncherBackground';
import {SearchInputBar} from './widget/SearchInput';

function resetAppSearchTextState(
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
  const monitorConnector = monitor.get_connector();

  const {text, setText, selectedIndex, setSelectedIndex, results} = createAppSearchTextState();

  const launcherBackground = createLauncherBackground();

  let focusTimer: Timer | null = null;

  const searchInputBar = SearchInputBar({
    text,
    setText,
    selectedIndex,
    setSelectedIndex,
    results,
    monitorConnector,
  });

  const appList = AppList({
    searchText: text,
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
          resetAppSearchTextState(searchInputBar, setText, setSelectedIndex);
        } else {
          focusTimer = focusLauncher(searchInputBar, appList);
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
            <overlay hexpand vexpand>
              {launcherBackground}
              <box $type="overlay" orientation={Gtk.Orientation.VERTICAL} vexpand>
                <box vexpand />
                <box class="applauncher-search-container" hexpand>
                  {searchInputBar}
                </box>
              </box>
            </overlay>
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
