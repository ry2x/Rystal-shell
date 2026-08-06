import { createState } from 'ags';

import Notifd from 'gi://AstalNotifd';

const notifd = Notifd.get_default();
const MAX_NOTIFICATIONS = 30;

function getInitialNotifications() {
  const persistentNotifications = notifd
    .get_notifications()
    .filter((notification) => !notification.transient)
    .sort((a, b) => b.time - a.time);
  const initialNotifications = persistentNotifications.slice(0, MAX_NOTIFICATIONS);

  persistentNotifications
    .slice(MAX_NOTIFICATIONS)
    .forEach((notification) => notification.dismiss());

  return initialNotifications;
}

export const [notifications, setNotifications] =
  createState<Notifd.Notification[]>(getInitialNotifications());

const notifiedHook = notifd.connect('notified', (_, id) => {
  const notification = notifd.get_notification(id);
  if (notification && !notification.transient) {
    const nextNotifications = [notification, ...notifications.peek()];
    const overflow = nextNotifications.slice(MAX_NOTIFICATIONS);
    setNotifications(nextNotifications.slice(0, MAX_NOTIFICATIONS));
    overflow.forEach((oldNotification) => oldNotification.dismiss());
  }
});

const resolvedHook = notifd.connect('resolved', (_, id) => {
  setNotifications(notifications.peek().filter((notification) => notification.id !== id));
});

export function dismissNotification(notification: Notifd.Notification) {
  notification.dismiss();
}

export function clearNotifications() {
  const current = notifications.peek();
  setNotifications([]);
  current.forEach((notification) => notification.dismiss());
}

export function disposeNotifications() {
  notifd.disconnect(notifiedHook);
  notifd.disconnect(resolvedHook);
}
