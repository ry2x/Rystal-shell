import Notifd from 'gi://AstalNotifd';
import GLib from 'gi://GLib';

const APP_NAME = 'Rystal Shell';
const APP_ICON = `${GLib.get_user_config_dir()}/ags/assets/icon.png`;

export function sendNotification(properties: Partial<Notifd.Notification.ConstructorProps>) {
  const notification = new Notifd.Notification({
    ...properties,
    app_name: APP_NAME,
    app_icon: APP_ICON,
  });
  try {
    Notifd.send_notification(notification, null);
  } catch (err) {
    console.error('Failed to send notification', err);
  }
}
