import {Gtk} from 'ags/gtk4';

import Notifd from 'gi://AstalNotifd';

import {scaleUiSize} from '@/lib/uiScale';
import {
  clearNotifications,
  dismissNotification,
  doNotDisturb,
  notifications,
  toggleDoNotDisturb,
} from '@/stores/notification/notification';
import AnimatedList from '@/widget/common/AnimatedList';
import EmptyState from '@/widget/common/EmptyState';
import NotificationCard from '@/widget/common/NotificationCard';
import {LucideIcon} from '@/widget/common/lucide';

export default function NotificationList() {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={scaleUiSize(16)} class="right-column">
      <box class="notif-header" spacing={scaleUiSize(8)}>
        <LucideIcon name="bell" pixelSize={20} />
        <label label="Notifications" class="dw-title" halign={Gtk.Align.START} hexpand />

        {/* DND Toggle */}
        <button
          class={doNotDisturb.as(enabled =>
            enabled ? 'notif-header-btn dnd active' : 'notif-header-btn dnd'
          )}
          onClicked={toggleDoNotDisturb}
          tooltipText="Toggle Do Not Disturb"
        >
          <box spacing={scaleUiSize(6)}>
            <LucideIcon
              name={doNotDisturb.as(enabled => (enabled ? 'bell-off' : 'bell'))}
              pixelSize={14}
            />
            <label label="DND" />
          </box>
        </button>

        {/* Clear All Button */}
        <button class="notif-header-btn clear-all" onClicked={clearNotifications}>
          <box spacing={scaleUiSize(6)}>
            <LucideIcon name="trash-2" pixelSize={14} />
            <label label="Clear All" />
          </box>
        </button>
      </box>

      {/* Notification List */}
      <overlay vexpand>
        <scrolledwindow
          cssClasses={['notif-scroll']}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vexpand
        >
          <box
            orientation={Gtk.Orientation.VERTICAL}
            marginStart={scaleUiSize(12)}
            marginEnd={scaleUiSize(12)}
          >
            <AnimatedList
              items={notifications}
              idFor={(notification: Notifd.Notification) => String(notification.id)}
              className="notif-list"
              spacing={scaleUiSize(12)}
              renderItem={(notification: Notifd.Notification) => (
                <NotificationCard
                  notif={notification}
                  onDismiss={() => dismissNotification(notification)}
                />
              )}
            />
          </box>
        </scrolledwindow>
        <EmptyState
          $type="overlay"
          className="notif-empty"
          visible={notifications.as(items => items.length === 0)}
          icon="bell-check"
          label="No Notifications"
        />
      </overlay>
    </box>
  );
}
