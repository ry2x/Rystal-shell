import { Gtk } from 'ags/gtk4';

import Notifd from 'gi://AstalNotifd';

import {
  clearNotifications,
  dismissNotification,
  doNotDisturb,
  notifications,
  toggleDoNotDisturb,
} from '../../../stores/notification';
import { LucideIcon } from '../../../widget/common/lucide';
import AnimatedList from '../../common/AnimatedList';
import NotificationCard from '../../common/NotificationCard';

export default function NotificationList() {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={16} class="right-column">
      <box class="notif-header" spacing={8}>
        <LucideIcon name="bell" pixelSize={20} />
        <label label="Notifications" class="dw-title" halign={Gtk.Align.START} hexpand />

        {/* DND Toggle */}
        <button
          class={doNotDisturb.as((enabled) =>
            enabled ? 'notif-header-btn dnd active' : 'notif-header-btn dnd',
          )}
          onClicked={toggleDoNotDisturb}
          tooltipText="Toggle Do Not Disturb"
        >
          <box spacing={6}>
            <LucideIcon
              name={doNotDisturb.as((enabled) => (enabled ? 'bell-off' : 'bell'))}
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
          renderItem={(notification: Notifd.Notification) => (
            <NotificationCard
              notif={notification}
              onDismiss={() => dismissNotification(notification)}
            />
          )}
        />
      </scrolledwindow>
    </box>
  );
}
