import { createBinding as bind } from 'ags';
import { Gtk } from 'ags/gtk4';

import Notifd from 'gi://AstalNotifd';

import { LucideIcon } from '../../../lib/lucide';
import {
  clearNotifications,
  dismissNotification,
  notifications,
} from '../../../services/notifications';
import AnimatedList from '../../common/AnimatedList';
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

        {/* Clear All Button */}
        <button class="notif-header-btn clear-all" onClicked={clearNotifications}>
          <box spacing={6}>
            <LucideIcon name="trash-2" pixelSize={14} />
            <label label="Clear All" css="font-size: 0.8em; font-weight: 600;" />
          </box>
        </button>
      </box>

      {/* Notification List */}
      <box
        visible={notifications.as((items) => items.length === 0)}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        css="min-height: 160px; color: alpha(currentColor, 0.5);"
      >
        <LucideIcon name="bell-check" pixelSize={25} css="margin-right: 8px;" />
        <label label="No Notifications" css="font-weight: 700;" />
      </box>
      <scrolledwindow
        cssClasses={['notif-scroll']}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vexpand={true}
      >
        <AnimatedList
          items={notifications}
          idFor={(notification: Notifd.Notification) => String(notification.id)}
          className="notif-list"
          spacing={12}
          renderItem={(notification: Notifd.Notification) =>
            (
              <NotificationCard
                notif={notification}
                onDismiss={() => dismissNotification(notification)}
              />
            ) as unknown as Gtk.Widget
          }
        />
      </scrolledwindow>
    </box>
  );
}
