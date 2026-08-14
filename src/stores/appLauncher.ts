import { type Accessor, type Setter, createState } from 'ags';

import Apps from 'gi://AstalApps';

export interface AppLauncherState {
  text: Accessor<string>;
  setText: Setter<string>;
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
  results: Accessor<Apps.Application[]>;
  setResults: Setter<Apps.Application[]>;
}

export function createAppLauncherState(): AppLauncherState {
  const [text, setText] = createState('');
  const [selectedIndex, setSelectedIndex] = createState(0);
  const [results, setResults] = createState<Apps.Application[]>([]);

  return {
    text,
    setText,
    selectedIndex,
    setSelectedIndex,
    results,
    setResults,
  };
}
