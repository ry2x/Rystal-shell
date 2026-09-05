import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type AppLauncherState} from '@/stores/application/appLauncherState';
import {ensureLauncherImage} from '@/stores/application/launcherPicture';

import {AppList, type AppListHandle} from './widget/AppList';
import {LauncherBackgroundImage} from './widget/BackgroundImage';
import {SearchInput, type SearchInputHandle} from './widget/SearchInput';

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
  let searchInput: SearchInputHandle | null = null;
  let appList: AppListHandle | null = null;

  const handle: AppLauncherContentHandle = {
    focus: () => {
      ensureLauncherImage();
      searchInput?.focus();
      appList?.resetScroll();
    },
    reset: () => searchInput?.reset(),
  };
  onCleanup(() => register(null));

  return (
    <box
      class="applauncher-window"
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      $={() => register(handle)}
    >
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
          <overlay hexpand vexpand>
            <LauncherBackgroundImage />
            <box $type="overlay" orientation={Gtk.Orientation.VERTICAL} vexpand>
              <box vexpand />
              <box class="applauncher-search-container" hexpand>
                <SearchInput
                  text={state.text}
                  setText={state.setText}
                  selectedIndex={state.selectedIndex}
                  setSelectedIndex={state.setSelectedIndex}
                  results={state.results}
                  monitorConnector={monitorConnector}
                  register={inputHandle => (searchInput = inputHandle)}
                />
              </box>
            </box>
          </overlay>
        </box>
        <box class="applauncher-right-panel" orientation={Gtk.Orientation.VERTICAL} hexpand={false}>
          <AppList
            text={state.text}
            selectedIndex={state.selectedIndex}
            results={state.results}
            monitorConnector={monitorConnector}
            register={listHandle => (appList = listHandle)}
          />
        </box>
      </box>
    </box>
  );
}
