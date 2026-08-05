import { createState } from 'ags';
import { Astal, Gdk, Gtk } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import Apps from 'gi://AstalApps';
import GLib from 'gi://GLib';

import {
  ensureLauncherBackground,
  registerLauncherBackground,
} from '../../services/launcherBackground';
import { AppList } from './widget/AppList';
import { SearchInput } from './widget/SearchInput';

GLib.setenv('GSK_RENDERER', 'gl', true);

export default function AppLauncher(gdkmonitor: Gdk.Monitor) {
  const [text, setText] = createState('');
  const [selectedIndex, setSelectedIndex] = createState(0);
  const monitorConnector = gdkmonitor.get_connector();

  let currentResults: Apps.Application[] = [];
  const launcherBackground = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canTarget: false,
    canShrink: true,
  });
  launcherBackground.set_hexpand(true);
  launcherBackground.set_vexpand(true);
  launcherBackground.set_halign(Gtk.Align.FILL);
  launcherBackground.set_valign(Gtk.Align.FILL);
  launcherBackground.set_size_request(1, 1);
  const unregisterLauncherBackground = registerLauncherBackground(launcherBackground);
  launcherBackground.connect('destroy', unregisterLauncherBackground);

  const searchInput = SearchInput({
    text,
    setText,
    selectedIndex,
    setSelectedIndex,
    getResults: () => currentResults,
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
    monitorConnector,
    onResultsChanged: (results) => {
      currentResults = results;
    },
  });

  const win = (
    <window
      name={`applauncher-${monitorConnector}`}
      class="AppLauncher"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.EXCLUSIVE}
      application={app}
      visible={false}
      onNotifyVisible={(self) => {
        if (!self.visible) {
          (searchInput as Gtk.Entry).set_text('');
          setText('');
          setSelectedIndex(0);
        } else {
          ensureLauncherBackground();
          GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            searchInput.grab_focus();
            appList.get_vadjustment()?.set_value(0);
            return GLib.SOURCE_REMOVE;
          });
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

  const winKeyCtrl = new Gtk.EventControllerKey();
  winKeyCtrl.connect('key-pressed', (_, keyval) => {
    if (keyval === Gdk.KEY_Escape) {
      win.set_visible(false);
      return true;
    }
    return false;
  });
  win.add_controller(winKeyCtrl);

  return win;
}
