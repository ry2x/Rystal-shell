import {type Accessor, type Setter, onCleanup} from 'ags';
import {Gdk, Gtk} from 'ags/gtk4';

import Apps from 'gi://AstalApps';

import {launchApplication, openLauncherQuery} from '@/stores/application/appLauncherAction';

export interface SearchInputProps {
  text: Accessor<string>;
  setText: Setter<string>;
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
  results: Accessor<Apps.Application[]>;
  monitorConnector: string | null;
  register: (handle: SearchInputHandle | null) => void;
}

export interface SearchInputHandle {
  focus: () => void;
  reset: () => void;
}

export function SearchInput({
  text,
  setText,
  selectedIndex,
  setSelectedIndex,
  results,
  monitorConnector,
  register,
}: SearchInputProps) {
  let searchEntry: Gtk.Entry | null = null;
  const handle: SearchInputHandle = {
    focus: () => searchEntry?.grab_focus(),
    reset: () => {
      searchEntry?.set_text('');
      setText('');
      setSelectedIndex(0);
    },
  };
  onCleanup(() => register(null));

  return (
    <entry
      class="applauncher-input"
      placeholderText="Search apps..."
      hexpand
      $={self => {
        searchEntry = self;
        self.connect('changed', () => {
          setText(self.get_text());
          setSelectedIndex(0);
        });
        register(handle);
      }}
    >
      <Gtk.EventControllerKey
        propagationPhase={Gtk.PropagationPhase.CAPTURE}
        onKeyPressed={(_controller, keyval) => {
          const appResults = results.peek();
          const hasQuery = text.peek().trim() !== '';
          const maxIndex = hasQuery ? appResults.length : appResults.length - 1;
          if (maxIndex < 0) return false;

          if (keyval === Gdk.KEY_Down) {
            setSelectedIndex(Math.min(selectedIndex.peek() + 1, maxIndex));
            return true;
          }
          if (keyval === Gdk.KEY_Up) {
            setSelectedIndex(Math.max(selectedIndex.peek() - 1, 0));
            return true;
          }
          if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
            const index = selectedIndex.peek();
            if (index === appResults.length) {
              openLauncherQuery(text.peek(), monitorConnector);
            } else if (index < appResults.length) {
              launchApplication(appResults[index], monitorConnector);
            }
            return true;
          }
          return false;
        }}
      />
    </entry>
  );
}
