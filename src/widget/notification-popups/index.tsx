import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import Notifd from 'gi://AstalNotifd';

import {type UiScaleContext} from '@/lib/uiScale';
import {createNotificationPopupState} from '@/stores/notification/notificationPopup';
import AnimatedList from '@/widget/common/AnimatedList';
import NotificationCard from '@/widget/common/NotificationCard';

export interface NotificationPopupsProps {
  monitor: Gdk.Monitor;
  uiScale: UiScaleContext;
}

export default function NotificationPopups({monitor, uiScale}: NotificationPopupsProps) {
  const {TOP, RIGHT} = Astal.WindowAnchor;
  const connector = monitor.get_connector();
  const {popups, visible} = createNotificationPopupState(connector);

  return (
    <window
      name={`notification-popups-${connector}`}
      class={`NotificationPopups ${uiScale.cssClass}`}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      anchor={TOP | RIGHT}
      marginTop={uiScale.size(12)}
      marginRight={uiScale.size(12)}
      layer={Astal.Layer.TOP}
      application={app}
      visible={visible}
    >
      <AnimatedList
        items={popups}
        idFor={(notification: Notifd.Notification) => String(notification.id)}
        className="notification-popup-list"
        spacing={uiScale.size(8)}
        renderItem={(notification: Notifd.Notification) => (
          <box halign={Gtk.Align.END}>
            <NotificationCard notif={notification} uiScale={uiScale} />
          </box>
        )}
      />
    </window>
  );
}
