import {type Accessor, type Setter, createMemo, createState} from 'ags';

import Apps from 'gi://AstalApps';

import {
  applicationHistoryRevision,
  applicationRegistryRevision,
  searchApps,
} from './applicationRegistry';

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
  const results = createMemo<Apps.Application[]>(() => {
    if (!contentLoaded()) return [];
    applicationRegistryRevision();
    applicationHistoryRevision();
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
