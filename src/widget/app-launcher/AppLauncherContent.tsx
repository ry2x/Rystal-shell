import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {type AppLauncherState} from '@/stores/application/appLauncher';
import {
  ensureLauncherBackground,
  registerLauncherBackground,
} from '@/stores/application/launcherBackground';
import {AppList} from '@/widget/app-launcher/widget/AppList';
import {SearchInput} from '@/widget/app-launcher/widget/SearchInput';

export interface AppLauncherContentHandle {
  focus: () => void;
  reset: () => void;
}

export interface AppLauncherContentProps {
  monitorConnector: string | null;
  state: AppLauncherState;
  register: (content: AppLauncherContentHandle | null) => void;
}

function createLauncherBackground() {
  const picture = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canTarget: false,
    canShrink: true,
    hexpand: true,
    vexpand: true,
    halign: Gtk.Align.FILL,
    valign: Gtk.Align.FILL,
    widthRequest: scaleUiSize(1),
    heightRequest: scaleUiSize(1),
  });

  const unregister = registerLauncherBackground(picture);
  picture.connect('destroy', unregister);
  return picture;
}

export default function AppLauncherContent({
  monitorConnector,
  state,
  register,
}: AppLauncherContentProps) {
  const launcherBackground = createLauncherBackground();
  const searchInput = SearchInput({...state, monitorConnector});
  const appList = AppList({...state, monitorConnector});

  const handle: AppLauncherContentHandle = {
    focus: () => {
      ensureLauncherBackground();
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
