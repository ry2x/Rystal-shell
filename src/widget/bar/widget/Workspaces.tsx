import { For } from 'ags';
import { Gdk, Gtk } from 'ags/gtk4';

import Hyprland from 'gi://AstalHyprland';

import { createMonitorWorkspaceState, focusWorkspace } from '../../../stores/shell/workspace';

export interface WorkspacesProps {
  monitor: Gdk.Monitor;
}

export default function Workspaces({ monitor }: WorkspacesProps) {
  const { workspaces, activeIndex, focusedWorkspaceId } = createMonitorWorkspaceState(
    monitor.get_connector(),
  );

  return (
    <box class="Workspaces" halign={Gtk.Align.FILL} orientation={Gtk.Orientation.VERTICAL}>
      <box
        class="active-indicator"
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.START}
        css={activeIndex.as(
          (index) => `margin-bottom: -14px; transform: translateY(${index * 22 - 2}px);`,
        )}
      />
      <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <For each={workspaces}>
          {(workspace: Hyprland.Workspace) => (
            <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
              <button
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.CENTER}
                class={focusedWorkspaceId.as((id) =>
                  id === workspace.id ? 'workspace active' : 'workspace',
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
