import {type Accessor, createBinding, createComputed, createExternal} from 'ags';

import Hyprland from 'gi://AstalHyprland';

export interface MonitorWorkspaceState {
  workspaces: Accessor<Hyprland.Workspace[]>;
  activeIndex: Accessor<number>;
  focusedWorkspaceId: Accessor<number>;
}

const hyprland = Hyprland.get_default();
const focusedWorkspace = createBinding(hyprland, 'focused_workspace');

function getMonitorWorkspaces(connector: string | null) {
  return hyprland
    .get_workspaces()
    .filter(workspace => workspace.monitor?.name === connector)
    .filter(workspace => !workspace.name.startsWith('special'))
    .sort((workspaceA, workspaceB) => workspaceA.id - workspaceB.id);
}

export function createMonitorWorkspaceState(connector: string | null): MonitorWorkspaceState {
  const workspaces = createExternal(getMonitorWorkspaces(connector), setWorkspaces => {
    const update = () => setWorkspaces(getMonitorWorkspaces(connector));
    const hooks = [
      hyprland.connect('workspace-added', update),
      hyprland.connect('workspace-removed', update),
      hyprland.connect('notify::monitors', update),
    ];

    return () => hooks.forEach(hook => hyprland.disconnect(hook));
  });
  const focusedWorkspaceId = focusedWorkspace.as(workspace => workspace?.id ?? -1);
  const activeIndex = createComputed(() => {
    const index = workspaces().findIndex(workspace => workspace.id === focusedWorkspaceId());
    return Math.max(index, 0);
  });

  return {workspaces, activeIndex, focusedWorkspaceId};
}

export function focusWorkspace(name: string) {
  hyprland.dispatch(`hl.dsp.focus({ workspace = "${name}" })`, '');
}
