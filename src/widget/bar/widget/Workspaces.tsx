import {type Accessor, For} from 'ags';
import {Gdk, Gtk} from 'ags/gtk4';
import {type Timer, timeout} from 'ags/time';

import Hyprland from 'gi://AstalHyprland';

import {type UiScaleContext} from '@/lib/uiScale';
import {createMonitorWorkspaceState, focusWorkspace} from '@/stores/shell/workspace';

export interface WorkspacesProps {
  monitor: Gdk.Monitor;
  uiScale: UiScaleContext;
}

const INDICATOR_STRETCH_DURATION = 190;

function setupIndicatorMotion(indicator: Gtk.Widget, activeIndex: Accessor<number>) {
  let previousIndex = activeIndex.peek();
  let stretchTimer: Timer | null = null;
  const unsubscribe = activeIndex.subscribe(() => {
    const nextIndex = activeIndex.peek();
    if (nextIndex === previousIndex) return;

    previousIndex = nextIndex;
    stretchTimer?.cancel();
    indicator.add_css_class('moving');
    stretchTimer = timeout(INDICATOR_STRETCH_DURATION, () => {
      indicator.remove_css_class('moving');
      stretchTimer = null;
    });
  });

  indicator.connect('destroy', () => {
    unsubscribe();
    stretchTimer?.cancel();
    stretchTimer = null;
  });
}

export default function Workspaces({monitor, uiScale}: WorkspacesProps) {
  const {workspaces, activeIndex, focusedWorkspaceId} = createMonitorWorkspaceState(
    monitor.get_connector()
  );

  return (
    <box class="Workspaces" halign={Gtk.Align.FILL} orientation={Gtk.Orientation.VERTICAL}>
      <box
        class="active-indicator"
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.START}
        canTarget={false}
        css={activeIndex.as(
          index =>
            `margin-bottom: ${uiScale.value(-13)}px; transform: translateY(${uiScale.value(index * 22 - 2)}px);`
        )}
        $={self => setupIndicatorMotion(self, activeIndex)}
      >
        <box class="active-indicator-dot" />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={uiScale.size(12)}>
        <For each={workspaces}>
          {(workspace: Hyprland.Workspace) => (
            <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
              <button
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.CENTER}
                class={focusedWorkspaceId.as(id =>
                  id === workspace.id ? 'workspace active' : 'workspace'
                )}
                onClicked={() => focusWorkspace(workspace.name)}
              />
            </box>
          )}
        </For>
      </box>
    </box>
  );
}
