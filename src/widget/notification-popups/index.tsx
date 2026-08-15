import { Astal, Gdk, Gtk } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import Notifd from 'gi://AstalNotifd';

import { createNotificationPopupState } from '../../stores/notification/notificationPopup';
import AnimatedList from '../common/AnimatedList';
import NotificationCard from '../common/NotificationCard';

export interface NotificationPopupsProps {
  monitor: Gdk.Monitor;
}

export default function NotificationPopups({ monitor }: NotificationPopupsProps) {
  const { TOP, RIGHT } = Astal.WindowAnchor;
  const connector = monitor.get_connector();
  const { popups, visible } = createNotificationPopupState(connector);

  return (
    <window
      name={`notification-popups-${connector}`}
      class="NotificationPopups"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      anchor={TOP | RIGHT}
      marginTop={12}
      marginRight={12}
      layer={Astal.Layer.TOP}
      application={app}
      visible={visible}
    >
      <AnimatedList
        items={popups}
        idFor={(notification: Notifd.Notification) => String(notification.id)}
        spacing={8}
        renderItem={(notification: Notifd.Notification) => (
          <box halign={Gtk.Align.END}>
            <NotificationCard notif={notification} />
          </box>
        )}
      />
    </window>
  );
}
