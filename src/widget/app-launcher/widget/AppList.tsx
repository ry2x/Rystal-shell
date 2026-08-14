import type { Accessor, Setter } from 'ags';
import { Gtk } from 'ags/gtk4';

import Apps from 'gi://AstalApps';
import GLib from 'gi://GLib';

import { searchApps } from '../../../stores/application';
import { createAppItem } from './AppItem';
import { SearchGoogleBtn } from './SearchGoogleBtn';

export interface AppListProps {
  text: Accessor<string>;
  selectedIndex: Accessor<number>;
  results: Accessor<Apps.Application[]>;
  setResults: Setter<Apps.Application[]>;
  monitorConnector: string | null;
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

function syncAppWidgets(
  appList: Gtk.Box,
  widgetMap: Map<string, Gtk.Widget>,
  currentResults: Apps.Application[],
  monitorConnector: string | null,
) {
  const resultKeys = new Set(currentResults.map((appInstance) => getAppKey(appInstance)));

  for (const [key, widget] of widgetMap) {
    if (!resultKeys.has(key)) {
      appList.remove(widget);
      widgetMap.delete(key);
    }
  }

  let previousWidget: Gtk.Widget | null = null;
  for (const appInstance of currentResults) {
    const key = getAppKey(appInstance);
    let widget = widgetMap.get(key);

    if (!widget) {
      widget = createAppItem({ res: appInstance, monitorConnector });
      widgetMap.set(key, widget);
      appList.append(widget);
    }

    widget.set_visible(true);
    appList.reorder_child_after(widget, previousWidget);
    previousWidget = widget;
  }
}

function scrollToSelection(scrollWindow: Gtk.ScrolledWindow, targetChild: Gtk.Widget) {
  const vadj = scrollWindow.get_vadjustment();
  const viewport = scrollWindow.get_child();
  if (!vadj || !viewport) return;

  const itemHeight = targetChild.get_height() || 50;
  const position = targetChild.translate_coordinates(viewport, 0, 0);
  if (!Array.isArray(position) || !position[0]) return;

  const visibleY = position[2];
  const visibleBottom = visibleY + itemHeight;
  const pageSize = vadj.get_page_size();

  if (visibleY < 0) {
    vadj.set_value(vadj.get_value() + visibleY - 10);
  } else if (visibleBottom > pageSize) {
    vadj.set_value(vadj.get_value() + (visibleBottom - pageSize) + 10);
  }
}

function updateSelection(
  appList: Gtk.Box,
  searchGoogleBtn: Gtk.Button,
  scrollWindow: Gtk.ScrolledWindow,
  selectedIndex: number,
  currentResults: Apps.Application[],
  query: string,
) {
  let targetChild: Gtk.Widget | null = null;

  let child = appList.get_first_child();
  let index = 0;
  while (child) {
    if (child.get_visible()) {
      if (index === selectedIndex) {
        child.add_css_class('selected');
        targetChild = child;
      } else {
        child.remove_css_class('selected');
      }
      index++;
    } else {
      child.remove_css_class('selected');
    }
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
  text,
  selectedIndex,
  results,
  setResults,
  monitorConnector,
}: AppListProps): Gtk.ScrolledWindow {
  const searchGoogleBtn = SearchGoogleBtn({
    textState: text,
    monitorConnector,
  });

  const appList = (<box orientation={Gtk.Orientation.VERTICAL} spacing={10} />) as Gtk.Box;
  const widgetMap = new Map<string, Gtk.Widget>();
  const scrollWindow = Object.assign(new Gtk.ScrolledWindow(), {
    cssClasses: ['applauncher-scroll'],
    hscrollbarPolicy: Gtk.PolicyType.NEVER,
    vscrollbarPolicy: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
    minContentWidth: 400,
    minContentHeight: 300,
    maxContentHeight: 600,
    propagateNaturalHeight: false,
    child: (
      <box orientation={Gtk.Orientation.VERTICAL} class="applauncher-list" spacing={10}>
        {appList}
        {searchGoogleBtn}
      </box>
    ),
  }) as Gtk.ScrolledWindow;

  function populateApps() {
    const safeT = text.peek() || '';
    const q = safeT.trim().toLowerCase();
    const currentResults = getUniqueResults(q);

    setResults(currentResults);
    syncAppWidgets(appList, widgetMap, currentResults, monitorConnector);

    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      updateSelection(
        appList,
        searchGoogleBtn,
        scrollWindow,
        selectedIndex.peek(),
        currentResults,
        q,
      );
      return GLib.SOURCE_REMOVE;
    });
  }

  const unsubscribeText = text.subscribe(() => populateApps());

  GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
    populateApps();
    return GLib.SOURCE_REMOVE;
  });

  const unsubscribeSelection = selectedIndex.subscribe(() => {
    updateSelection(
      appList,
      searchGoogleBtn,
      scrollWindow,
      selectedIndex.peek(),
      results.peek(),
      text.peek().trim(),
    );
  });

  scrollWindow.connect('destroy', () => {
    unsubscribeText();
    unsubscribeSelection();
    widgetMap.clear();
  });

  return scrollWindow;
}
