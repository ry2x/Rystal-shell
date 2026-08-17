import {type Accessor, type Setter, createComputed, createState} from 'ags';

import Apps from 'gi://AstalApps';

import {searchApps} from '@/stores/application/applicationCatalog';

export interface AppLauncherState {
  text: Accessor<string>;
  setText: Setter<string>;
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
  results: Accessor<Apps.Application[]>;
}

export function createAppLauncherState(): AppLauncherState {
  const [text, setText] = createState('');
  const [selectedIndex, setSelectedIndex] = createState(0);
  const results = createComputed(() => searchApps(text().trim().toLowerCase()));

  return {
    text,
    setText,
    selectedIndex,
    setSelectedIndex,
    results,
  };
}
