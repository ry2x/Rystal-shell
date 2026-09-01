import {type Accessor, type Setter, createComputed, createState} from 'ags';

import Apps from 'gi://AstalApps';

import {searchApps} from '@/stores/application/applicationCatalog';

export interface AppLauncherState {
  contentLoaded: Accessor<boolean>;
  text: Accessor<string>;
  setText: Setter<string>;
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
  results: Accessor<Apps.Application[]>;
  loadContent: () => void;
}

export function createAppLauncherState(): AppLauncherState {
  const [contentLoaded, setContentLoaded] = createState(false);
  const [text, setText] = createState('');
  const [selectedIndex, setSelectedIndex] = createState(0);
  const results = createComputed<Apps.Application[]>(() => {
    if (!contentLoaded()) return [];
    return searchApps(text().trim().toLowerCase());
  });

  return {
    contentLoaded,
    text,
    setText,
    selectedIndex,
    setSelectedIndex,
    results,
    loadContent: () => setContentLoaded(true),
  };
}
