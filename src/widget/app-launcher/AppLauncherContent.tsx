import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type AppLauncherState} from '@/stores/application/appLauncherState';
import {ensureLauncherImage} from '@/stores/application/launcherPicture';

import {AppList} from './widget/AppList';
import {LauncherBackgroundImage} from './widget/BackgroundImage';
import {SearchInput} from './widget/SearchInput';

export interface AppLauncherContentHandle {
  focus: () => void;
  reset: () => void;
}

export interface AppLauncherContentProps {
  monitorConnector: string | null;
  state: AppLauncherState;
  register: (content: AppLauncherContentHandle | null) => void;
}

export default function AppLauncherContent({
  monitorConnector,
  state,
  register,
}: AppLauncherContentProps) {
  const launcherBackground = LauncherBackgroundImage();
  const searchInput = SearchInput({...state, monitorConnector});
  const appList = AppList({...state, monitorConnector});

  const handle: AppLauncherContentHandle = {
    focus: () => {
      ensureLauncherImage();
      searchInput.grab_focus();
      appList.get_vadjustment()?.set_value(0);
    },
    reset: () => {
      searchInput.set_text('');
      state.setText('');
      state.setSelectedIndex(0);
    },
  };
  register(handle);
  onCleanup(() => register(null));

  const launcherContent = (
    <box orientation={Gtk.Orientation.VERTICAL} vexpand>
      <box vexpand />
      <box class="applauncher-search-container" hexpand>
        {searchInput}
      </box>
    </box>
  ) as Gtk.Box;

  return (
    <box class="applauncher-window" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
      <box
        class="applauncher-box-wrapper"
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        overflow={Gtk.Overflow.HIDDEN}
      >
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
        <box class="applauncher-right-panel" orientation={Gtk.Orientation.VERTICAL} hexpand={false}>
          {appList}
        </box>
      </box>
    </box>
  );
}
