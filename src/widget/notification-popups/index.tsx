import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import Notifd from 'gi://AstalNotifd';

import {scaleUiSize} from '@/lib/uiScale';
import {createNotificationPopupState} from '@/stores/notification/notificationPopup';
import AnimatedList from '@/widget/common/AnimatedList';
import NotificationCard from '@/widget/common/NotificationCard';

export interface NotificationPopupsProps {
  monitor: Gdk.Monitor;
}

function getNotificationId(notification: Notifd.Notification) {
  return String(notification.id);
}

function renderNotification(notification: Notifd.Notification) {
  return (
    <box halign={Gtk.Align.END}>
      <NotificationCard notif={notification} />
    </box>
  );
}

export default function NotificationPopups({monitor}: NotificationPopupsProps) {
  const {TOP, RIGHT} = Astal.WindowAnchor;
  const connector = monitor.get_connector();
  const {popups, visible} = createNotificationPopupState(connector);

  return (
    <window
      name={`notification-popups-${connector}`}
      class="NotificationPopups"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      anchor={TOP | RIGHT}
      marginTop={scaleUiSize(12)}
      marginRight={scaleUiSize(12)}
      layer={Astal.Layer.TOP}
      application={app}
      visible={visible}
    >
      <AnimatedList
        items={popups}
        idFor={getNotificationId}
        className="notification-popup-list"
        spacing={scaleUiSize(8)}
        renderItem={renderNotification}
      />
    </window>
  );
}
