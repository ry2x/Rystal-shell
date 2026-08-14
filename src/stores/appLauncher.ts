import { type Accessor, type Setter, createComputed, createState } from 'ags';

import Apps from 'gi://AstalApps';

import { searchApps } from './application';

export interface AppLauncherState {
  text: Accessor<string>;
  setText: Setter<string>;
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
  results: Accessor<Apps.Application[]>;
}

function getAppKey(appInstance: Apps.Application) {
  return appInstance.name + (appInstance.description || '') + (appInstance.iconName || '');
}

function getUniqueResults(query: string) {
  const uniqueResults: Apps.Application[] = [];
  const seen = new Set<string>();

  for (const appInstance of searchApps(query)) {
    const key = getAppKey(appInstance);
    if (seen.has(key)) continue;

    seen.add(key);
    uniqueResults.push(appInstance);
  }

  return uniqueResults;
}

export function createAppLauncherState(): AppLauncherState {
  const [text, setText] = createState('');
  const [selectedIndex, setSelectedIndex] = createState(0);
  const results = createComputed(() => getUniqueResults(text().trim().toLowerCase()));

  return {
    text,
    setText,
    selectedIndex,
    setSelectedIndex,
    results,
  };
}
