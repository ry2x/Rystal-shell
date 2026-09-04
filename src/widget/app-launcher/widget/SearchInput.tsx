import type {Accessor, Setter} from 'ags';
import {Gdk, Gtk} from 'ags/gtk4';

import Apps from 'gi://AstalApps';

import {recordAppLaunch} from '@/stores/application/applicationList';
import {openQuery} from '@/stores/application/websearch';
import {toggleAppLauncher} from '@/stores/shell/windowManager';

export interface SearchInputProps {
  text: Accessor<string>;
  setText: Setter<string>;
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
  results: Accessor<Apps.Application[]>;
  monitorConnector: string | null;
}

export function SearchInput({
  text,
  setText,
  selectedIndex,
  setSelectedIndex,
  results,
  monitorConnector,
}: SearchInputProps): Gtk.Entry {
  const searchEntry = (
    <entry class="applauncher-input" placeholderText="Search apps..." hexpand />
  ) as Gtk.Entry;

  searchEntry.connect('changed', () => {
    setText(searchEntry.get_text());
    setSelectedIndex(0);
  });

  const entryKeyCtrl = new Gtk.EventControllerKey();
  entryKeyCtrl.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
  entryKeyCtrl.connect('key-pressed', (_, keyval) => {
    const appResults = results.peek();
    const maxIndex = (text.peek() || '').trim() !== '' ? appResults.length : appResults.length - 1;
    if (maxIndex < 0) return false;

    if (keyval === Gdk.KEY_Down) {
      const newIndex = Math.min(selectedIndex.peek() + 1, maxIndex);
      setSelectedIndex(newIndex);
      return true;
    }
    if (keyval === Gdk.KEY_Up) {
      const newIndex = Math.max(selectedIndex.peek() - 1, 0);
      setSelectedIndex(newIndex);
      return true;
    }
    if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
      const idx = selectedIndex.peek();
      if (idx === appResults.length) {
        const searchQuery = text.peek();
        toggleAppLauncher(monitorConnector);
        openQuery(searchQuery);
      } else if (idx < appResults.length) {
        toggleAppLauncher(monitorConnector);
        recordAppLaunch(appResults[idx]);
        appResults[idx].launch();
      }
      return true;
    }
    return false;
  });
  searchEntry.add_controller(entryKeyCtrl);

  return searchEntry;
}
