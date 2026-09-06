import {createBinding, createState} from 'ags';

import Notifd from 'gi://AstalNotifd';

import {appConfig} from '@/lib/config';

const MAX_NOTIFICATIONS = appConfig.notifications.maxCount;

const notifd = Notifd.get_default();
export const doNotDisturb = createBinding(notifd, 'dontDisturb');

function uniqueNotifications(notifications: Notifd.Notification[]) {
  const seenIds = new Set<number>();
  return notifications.filter(notification => {
    if (seenIds.has(notification.id)) return false;
    seenIds.add(notification.id);
    return true;
  });
}

function getInitialNotifications() {
  const persistentNotifications = uniqueNotifications(
    notifd
      .get_notifications()
      .filter(notification => !notification.transient)
      .sort((a, b) => b.time - a.time)
  );
  const initialNotifications = persistentNotifications.slice(0, MAX_NOTIFICATIONS);

  persistentNotifications.slice(MAX_NOTIFICATIONS).forEach(notification => notification.dismiss());

  return initialNotifications;
}

const [notificationsState, setNotifications] =
  createState<Notifd.Notification[]>(getInitialNotifications());
export const notifications = notificationsState;

notifd.connect('notified', (_, id) => {
  const notification = notifd.get_notification(id);
  if (notification && !notification.transient) {
    const nextNotifications = [
      notification,
      ...notifications.peek().filter(current => current.id !== id),
    ];
    const overflow = nextNotifications.slice(MAX_NOTIFICATIONS);
    setNotifications(nextNotifications.slice(0, MAX_NOTIFICATIONS));
    overflow.forEach(oldNotification => oldNotification.dismiss());
  }
});

notifd.connect('resolved', (_, id) => {
  setNotifications(notifications.peek().filter(notification => notification.id !== id));
});

export function dismissNotification(notification: Notifd.Notification) {
  notification.dismiss();
}

export function clearNotifications() {
  const current = notifications.peek();
  setNotifications([]);
  current.forEach(notification => notification.dismiss());
}

export function toggleDoNotDisturb() {
  notifd.dontDisturb = !notifd.dontDisturb;
  return notifd.dontDisturb;
}
