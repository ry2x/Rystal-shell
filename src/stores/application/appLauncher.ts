import {type Accessor, type Setter, createComputed, createState} from 'ags';

import Apps from 'gi://AstalApps';

import {searchApps} from '@/stores/application/applicationCatalog';

/** Reactive state used by the application launcher's search UI. */
export interface AppSearchTextState {
  /** Current search text. */
  text: Accessor<string>;
  /** Updates the search text. */
  setText: Setter<string>;
  /** Index of the currently selected result. */
  selectedIndex: Accessor<number>;
  /** Updates the selected result index. */
  setSelectedIndex: Setter<number>;
  /** Applications matching the current search text. */
  results: Accessor<Apps.Application[]>;
}

export function createAppSearchTextState(): AppSearchTextState {
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
