import { type Accessor, createState, onCleanup } from 'ags';
import { type Timer, timeout } from 'ags/time';

import Hyprland from 'gi://AstalHyprland';
import Notifd from 'gi://AstalNotifd';

import { shellMotion } from '../../lib/motion';

export interface NotificationPopupState {
  popups: Accessor<Notifd.Notification[]>;
  visible: Accessor<boolean>;
}

const POPUP_TIMEOUT_MS = 5000;
const hyprland = Hyprland.get_default();
const notifd = Notifd.get_default();

export function createNotificationPopupState(
  monitorConnector: string | null,
): NotificationPopupState {
  const [popups, setPopups] = createState<Notifd.Notification[]>([]);
  const [visible, setVisible] = createState(false);
  const expiryTimers = new Map<number, Timer>();
  const releaseTimers = new Map<number, Timer>();
  let hideTimer: Timer | null = null;

  const cancelTimer = (timers: Map<number, Timer>, id: number) => {
    timers.get(id)?.cancel();
    timers.delete(id);
  };

  const removePopup = (id: number, releaseTransient: boolean) => {
    cancelTimer(expiryTimers, id);

    const notification = popups.peek().find((popup) => popup.id === id);
    if (!notification) return;

    const remainingPopups = popups.peek().filter((popup) => popup.id !== id);
    setPopups(remainingPopups);
    if (remainingPopups.length === 0) {
      hideTimer?.cancel();
      hideTimer = timeout(shellMotion.listDuration, () => {
        hideTimer = null;
        setVisible(false);
      });
    }
    if (!releaseTransient || !notification.transient) return;

    cancelTimer(releaseTimers, id);
    releaseTimers.set(
      id,
      timeout(shellMotion.listDuration, () => {
        releaseTimers.delete(id);
        notification.dismiss();
      }),
    );
  };

  const scheduleExpiry = (id: number) => {
    cancelTimer(expiryTimers, id);
    expiryTimers.set(
      id,
      timeout(POPUP_TIMEOUT_MS, () => {
        expiryTimers.delete(id);
        removePopup(id, true);
      }),
    );
  };

  const notifiedHook = notifd.connect('notified', (_, id) => {
    if (notifd.dont_disturb || hyprland.get_focused_monitor().name !== monitorConnector) return;

    const notification = notifd.get_notification(id);
    if (!notification) return;

    cancelTimer(releaseTimers, id);
    hideTimer?.cancel();
    hideTimer = null;
    setVisible(true);
    if (!popups.peek().some((popup) => popup.id === id)) {
      setPopups([notification, ...popups.peek()]);
    }
    scheduleExpiry(id);
  });

  const resolvedHook = notifd.connect('resolved', (_, id) => removePopup(id, false));

  onCleanup(() => {
    notifd.disconnect(notifiedHook);
    notifd.disconnect(resolvedHook);
    for (const timer of expiryTimers.values()) timer.cancel();
    for (const timer of releaseTimers.values()) timer.cancel();
    hideTimer?.cancel();
    hideTimer = null;
    expiryTimers.clear();
    releaseTimers.clear();
  });

  return { popups, visible };
}
