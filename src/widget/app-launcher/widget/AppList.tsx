import {type Accessor, For, createEffect, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';
import {type Timer, idle} from 'ags/time';

import Apps from 'gi://AstalApps';

import {type UiScaleContext} from '@/lib/uiScale';
import {AppItem} from '@/widget/app-launcher/widget/AppItem';
import {SearchGoogleBtn} from '@/widget/app-launcher/widget/SearchGoogleBtn';

export interface AppListProps {
  text: Accessor<string>;
  selectedIndex: Accessor<number>;
  results: Accessor<Apps.Application[]>;
  monitorConnector: string | null;
  uiScale: UiScaleContext;
}

function scrollToSelection(
  scrollWindow: Gtk.ScrolledWindow,
  targetChild: Gtk.Widget,
  uiScale: UiScaleContext
) {
  const adjustment = scrollWindow.get_vadjustment();
  const viewport = scrollWindow.get_child();
  if (!adjustment || !viewport) return;

  const itemHeight = targetChild.get_height() || uiScale.size(50);
  const position = targetChild.translate_coordinates(viewport, 0, 0);
  if (!position[0]) return;

  const visibleY = position[2];
  const visibleBottom = visibleY + itemHeight;
  const pageSize = adjustment.get_page_size();

  if (visibleY < 0) {
    adjustment.set_value(adjustment.get_value() + visibleY - uiScale.size(10));
  } else if (visibleBottom > pageSize) {
    adjustment.set_value(adjustment.get_value() + visibleBottom - pageSize + uiScale.size(10));
  }
}

function updateSelection(
  appList: Gtk.Box,
  searchGoogleBtn: Gtk.Button,
  scrollWindow: Gtk.ScrolledWindow,
  selectedIndex: number,
  currentResults: Apps.Application[],
  query: string,
  uiScale: UiScaleContext
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

  if (targetChild) scrollToSelection(scrollWindow, targetChild, uiScale);
}

export function AppList({
  text,
  selectedIndex,
  results,
  monitorConnector,
  uiScale,
}: AppListProps): Gtk.ScrolledWindow {
  const searchGoogleBtn = SearchGoogleBtn({
    textState: text,
    monitorConnector,
    uiScale,
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
      minContentWidth={uiScale.size(400)}
      minContentHeight={uiScale.size(300)}
      maxContentHeight={uiScale.size(600)}
      propagateNaturalHeight={false}
      $={self => (scrollWindow = self)}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        class="applauncher-list"
        spacing={uiScale.size(10)}
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={uiScale.size(10)}
          $={self => (appList = self)}
        >
          <For each={results}>
            {appInstance => (
              <AppItem res={appInstance} monitorConnector={monitorConnector} uiScale={uiScale} />
            )}
          </For>
        </box>
        {searchGoogleBtn}
      </box>
    </scrolledwindow>
  ) as Gtk.ScrolledWindow;

  createEffect(() => {
    selectedIndex();
    results();
    text();

    selectionTimer?.cancel();
    selectionTimer = idle(() => {
      selectionTimer = null;
      updateSelection(
        appList,
        searchGoogleBtn,
        scrollWindow,
        selectedIndex.peek(),
        results.peek(),
        text.peek().trim(),
        uiScale
      );
    });
  });

  onCleanup(() => {
    selectionTimer?.cancel();
    selectionTimer = null;
  });

  return widget;
}
