import {type Accessor, For, createEffect, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';
import {type Timer, idle} from 'ags/time';

import Apps from 'gi://AstalApps';

import {AppItem} from './AppItem';
import {SearchGoogleBtn} from './SearchGoogleBtn';

export interface AppListProps {
  searchText: Accessor<string>;
  selectedIndex: Accessor<number>;
  results: Accessor<Apps.Application[]>;
  monitorConnector: string | null;
}

/**
 * Adjust the scroll position of the provided scroll window to
 * ensure that the target child widget is visible within the viewport.
 */
function scrollToSelection(scrollWindow: Gtk.ScrolledWindow, targetChild: Gtk.Widget) {
  const adjustment = scrollWindow.get_vadjustment();
  const viewport = scrollWindow.get_child();
  if (!adjustment || !viewport) return;

  const itemHeight = targetChild.get_height() || 50;
  const position = targetChild.translate_coordinates(viewport, 0, 0);
  if (!position[0]) return;

  const visibleY = position[2];
  const visibleBottom = visibleY + itemHeight;
  const pageSize = adjustment.get_page_size();

  if (visibleY < 0) {
    adjustment.set_value(adjustment.get_value() + visibleY - 10);
  } else if (visibleBottom > pageSize) {
    adjustment.set_value(adjustment.get_value() + visibleBottom - pageSize + 10);
  }
}

/**
 * Updates the selection state of the application list and the "Search Google" button
 * based on the current selected index and search query.
 * It ensures that only one item is highlighted at a time and scrolls to
 * the selected item if necessary.
 */
function updateSelection(
  appList: Gtk.Box,
  searchGoogleBtn: Gtk.Button,
  scrollWindow: Gtk.ScrolledWindow,
  selectedIndex: number,
  currentResults: Apps.Application[],
  query: string
) {
  let targetChild: Gtk.Widget | null = null;
  let child = appList.get_first_child();
  let index = 0;

  while (child) {
    if (index === selectedIndex) {
      child.add_css_class('selected');
      targetChild = child;
    } else {
      child.remove_css_class('selected');
    }
    index++;
    child = child.get_next_sibling();
  }

  if (selectedIndex === currentResults.length && query !== '') {
    searchGoogleBtn.add_css_class('selected');
    targetChild = searchGoogleBtn;
  } else {
    searchGoogleBtn.remove_css_class('selected');
  }

  if (targetChild) scrollToSelection(scrollWindow, targetChild);
}

export function AppList({
  searchText,
  selectedIndex,
  results,
  monitorConnector,
}: AppListProps): Gtk.ScrolledWindow {
  const searchGoogleBtn = SearchGoogleBtn({
    searchText,
    monitorConnector,
  });

  let appList!: Gtk.Box;
  let scrollWindow!: Gtk.ScrolledWindow;
  let selectionTimer: Timer | null = null;

  const widget = (
    <scrolledwindow
      class="applauncher-scroll"
      hscrollbarPolicy={Gtk.PolicyType.NEVER}
      vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      vexpand
      minContentWidth={400}
      minContentHeight={300}
      maxContentHeight={600}
      propagateNaturalHeight={false}
      $={self => (scrollWindow = self)}
    >
      <box orientation={Gtk.Orientation.VERTICAL} class="applauncher-list" spacing={10}>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10} $={self => (appList = self)}>
          <For each={results}>
            {appInstance => <AppItem app={appInstance} monitorConnector={monitorConnector} />}
          </For>
        </box>
        {searchGoogleBtn}
      </box>
    </scrolledwindow>
  ) as Gtk.ScrolledWindow;

  createEffect(() => {
    selectedIndex();
    results();
    searchText();

    selectionTimer?.cancel();
    selectionTimer = idle(() => {
      selectionTimer = null;
      updateSelection(
        appList,
        searchGoogleBtn,
        scrollWindow,
        selectedIndex.peek(),
        results.peek(),
        searchText.peek().trim()
      );
    });
  });

  onCleanup(() => {
    selectionTimer?.cancel();
    selectionTimer = null;
  });

  return widget;
}
