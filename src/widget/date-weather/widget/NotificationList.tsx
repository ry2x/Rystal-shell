import {Gtk} from 'ags/gtk4';

import Notifd from 'gi://AstalNotifd';

import {type UiScaleContext} from '@/lib/uiScale';
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

export interface NotificationListProps {
  uiScale: UiScaleContext;
}
export default function NotificationList({uiScale}: NotificationListProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={uiScale.size(16)} class="right-column">
      <box class="notif-header" spacing={uiScale.size(8)}>
        <LucideIcon name="bell" pixelSize={20} uiScale={uiScale} />
        <label label="Notifications" class="dw-title" halign={Gtk.Align.START} hexpand />

        {/* DND Toggle */}
        <button
          class={doNotDisturb.as(enabled =>
            enabled ? 'notif-header-btn dnd active' : 'notif-header-btn dnd'
          )}
          onClicked={toggleDoNotDisturb}
          tooltipText="Toggle Do Not Disturb"
        >
          <box spacing={uiScale.size(6)}>
            <LucideIcon
              name={doNotDisturb.as(enabled => (enabled ? 'bell-off' : 'bell'))}
              pixelSize={14}
              uiScale={uiScale}
            />
            <label label="DND" />
          </box>
        </button>

        {/* Clear All Button */}
        <button class="notif-header-btn clear-all" onClicked={clearNotifications}>
          <box spacing={uiScale.size(6)}>
            <LucideIcon name="trash-2" pixelSize={14} uiScale={uiScale} />
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
            marginStart={uiScale.size(12)}
            marginEnd={uiScale.size(12)}
          >
            <AnimatedList
              items={notifications}
              idFor={(notification: Notifd.Notification) => String(notification.id)}
              className="notif-list"
              spacing={uiScale.size(12)}
              renderItem={(notification: Notifd.Notification) => (
                <NotificationCard
                  notif={notification}
                  onDismiss={() => dismissNotification(notification)}
                  uiScale={uiScale}
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
          uiScale={uiScale}
        />
      </overlay>
    </box>
  );
}
