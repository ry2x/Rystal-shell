import { For, createBinding as bind } from 'ags';
import { Gtk } from 'ags/gtk4';

import Notifd from 'gi://AstalNotifd';

import { LucideIcon } from '../../../lib/lucide';
import {
  clearNotifications,
  dismissNotification,
  notifications,
} from '../../../services/notifications';
import NotificationCard from '../../common/NotificationCard';

export default function NotificationList() {
  const notifd = Notifd.get_default();

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={16} class="right-column">
      <box class="notif-header" spacing={8}>
        <LucideIcon name="bell" pixelSize={20} />
        <label label="Notifications" class="dw-title" halign={Gtk.Align.START} hexpand />

        {/* DND Toggle */}
        <button
          class={bind(notifd, 'dontDisturb').as((d) =>
            d ? 'notif-header-btn dnd active' : 'notif-header-btn dnd',
          )}
          onClicked={() => {
            notifd.dontDisturb = !notifd.dontDisturb;
          }}
          tooltipText="Toggle Do Not Disturb"
        >
          <box spacing={6}>
            <LucideIcon
              name={bind(notifd, 'dontDisturb').as((d) => (d ? 'bell-off' : 'bell'))}
              pixelSize={14}
            />
            <label label="DND" css="font-size: 0.8em; font-weight: 600;" />
          </box>
        </button>

        <button class="notif-header-btn clear-all" onClicked={clearNotifications}>
          <box spacing={6}>
            <LucideIcon name="trash-2" pixelSize={14} />
            <label label="Clear All" css="font-size: 0.8em; font-weight: 600;" />
          </box>
        </button>
      </box>

      <scrolledwindow
        cssClasses={['notif-scroll']}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vexpand={true}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={12} class="notif-list">
          <For each={notifications}>
            {(notif) => {
              const n = notif as Notifd.Notification;
              return (
                <revealer
                  transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
                  transitionDuration={300}
                  revealChild={true}
                >
                  <revealer
                    transitionType={Gtk.RevealerTransitionType.CROSSFADE}
                    transitionDuration={300}
                    revealChild={true}
                  >
                    <NotificationCard notif={n} onDismiss={() => dismissNotification(n)} />
                  </revealer>
                </revealer>
              );
            }}
          </For>
        </box>
      </scrolledwindow>
    </box>
  );
}
