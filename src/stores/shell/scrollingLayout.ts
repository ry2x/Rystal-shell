import {type Accessor} from 'ags';

import Hyprland from 'gi://AstalHyprland';

import {createLazyAccessor} from '@/stores/common/lazyAccessor';

const UPDATE_DELAY_MS = 10;

export interface ScrollingLayoutInfo {
  visible: boolean;
  current: number;
  total: number;
}

interface HyprlandLayoutOption {
  str?: string;
}

const hyprland = Hyprland.get_default();

export function createScrollingLayoutInfo(connector: string | null): Accessor<ScrollingLayoutInfo> {
  const initialInfo: ScrollingLayoutInfo = {visible: false, current: 0, total: 0};

  return createLazyAccessor(initialInfo, setInfo => {
    let currentLayout = 'scrolling';
    let updateTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const publishInfo = (current: number, total: number) => {
      setInfo({
        visible: currentLayout === 'scrolling' && total > 0,
        current,
        total,
      });
    };

    const updateLayout = () => {
      hyprland.message_async('j/getoption general:layout', (_, result) => {
        try {
          const output = hyprland.message_finish(result);
          if (disposed) return;

          const option = JSON.parse(output) as HyprlandLayoutOption;
          currentLayout = option.str ?? '';
          setInfo(info => ({
            ...info,
            visible: currentLayout === 'scrolling' && info.total > 0,
          }));
        } catch (error) {
          console.error('Failed to read Hyprland layout', error);
        }
      });
    };

    const updateInfo = () => {
      if (updateTimer !== null) return;

      updateTimer = setTimeout(() => {
        updateTimer = null;
        if (disposed) return;

        const monitor = hyprland.monitors.find(candidate => candidate.name === connector);
        const workspace = monitor?.active_workspace;
        if (!workspace) {
          publishInfo(0, 0);
          return;
        }

        const clients = workspace.clients
          .filter(client => !client.floating)
          .sort((clientA, clientB) => clientA.x - clientB.x);
        if (clients.length === 0) {
          publishInfo(0, 0);
          return;
        }

        const focusedClient = hyprland.focused_client;
        const activeClient =
          focusedClient?.workspace?.id === workspace.id ? focusedClient : workspace.last_client;
        const index = activeClient
          ? clients.findIndex(client => client.address === activeClient.address)
          : -1;
        publishInfo(index >= 0 ? index + 1 : 0, clients.length);
      }, UPDATE_DELAY_MS);
    };

    const hooks = [
      hyprland.connect('event', (_, event) => {
        if (event === 'configreloaded' || event.includes('scrolling')) updateLayout();
      }),
      hyprland.connect('notify::focused-workspace', updateInfo),
      hyprland.connect('notify::focused-client', updateInfo),
      hyprland.connect('client-added', updateInfo),
      hyprland.connect('client-removed', updateInfo),
      hyprland.connect('client-moved', updateInfo),
    ];

    updateLayout();
    updateInfo();

    return () => {
      disposed = true;
      if (updateTimer !== null) clearTimeout(updateTimer);
      hooks.forEach(hook => hyprland.disconnect(hook));
    };
  });
}

export function toggleScrollingOverview() {
  hyprland.dispatch('hl.plugin.scrolloverview.overview("toggle")', '');
}
