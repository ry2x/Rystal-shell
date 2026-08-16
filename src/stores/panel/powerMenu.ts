import {type Accessor, createState, onCleanup} from 'ags';
import {Gdk} from 'ags/gtk4';
import {execAsync} from 'ags/process';
import {type Timer, idle, timeout} from 'ags/time';

import GLib from 'gi://GLib';

import {shellMotion} from '../../lib/motion';
import {activateSidePanel, activeSidePanel, deactivateSidePanel} from '../shell/windowManager';

type PowerAction = 'shutdown' | 'reboot' | 'logout' | 'sleep' | 'lock';

export interface PowerItem {
  action: PowerAction;
  label: string;
  shortcut: string;
  icon: string;
  dangerous?: boolean;
}

export const POWER_ITEMS: PowerItem[] = [
  {action: 'shutdown', label: 'Shutdown', shortcut: 'u', icon: 'power', dangerous: true},
  {action: 'reboot', label: 'Reboot', shortcut: 'r', icon: 'rotate-ccw', dangerous: true},
  {action: 'logout', label: 'Logout', shortcut: 'e', icon: 'log-out', dangerous: true},
  {action: 'sleep', label: 'Sleep', shortcut: 's', icon: 'moon'},
  {action: 'lock', label: 'Lock', shortcut: 'l', icon: 'lock'},
];

export interface PowerMenuStateOptions {
  monitorConnector: string | null;
  focusItem: (index: number) => void;
  focusConfirmation: (index: number) => void;
}

export interface PowerMenuState {
  visible: Accessor<boolean>;
  revealed: Accessor<boolean>;
  selectedIndex: Accessor<number>;
  confirmation: Accessor<PowerItem | null>;
  confirmationMotion: Accessor<boolean>;
  errorMessage: Accessor<string>;
  showAnimated: () => void;
  hideAnimated: () => void;
  requestAction: (item: PowerItem) => void;
  confirmAction: () => void;
  selectItem: (index: number) => void;
  selectConfirmation: (index: number) => void;
  handleKey: (keyval: number) => boolean;
}

const CONFIRM_MOVE_MS = 300;
const CONFIRM_FADE_MS = 180;
const MOVE_INTERVAL_US = 83_333;

async function executePowerAction(action: PowerAction) {
  switch (action) {
    case 'shutdown':
      await execAsync(['systemctl', 'poweroff']);
      break;
    case 'reboot':
      await execAsync(['systemctl', 'reboot']);
      break;
    case 'logout': {
      const sessionId = GLib.getenv('XDG_SESSION_ID');
      if (!sessionId) throw new Error('XDG_SESSION_ID is not set');
      await execAsync(['loginctl', 'kill-session', sessionId]);
      break;
    }
    case 'sleep':
      await execAsync(['loginctl', 'lock-session']);
      await execAsync(['systemctl', 'suspend']);
      break;
    case 'lock':
      await execAsync(['loginctl', 'lock-session']);
      break;
  }
}

export function createPowerMenuState({
  monitorConnector,
  focusItem: focusItemWidget,
  focusConfirmation,
}: PowerMenuStateOptions): PowerMenuState {
  const [visible, setVisible] = createState(false);
  const [revealed, setRevealed] = createState(false);
  const [selectedIndex, setSelectedIndex] = createState(0);
  const [confirmation, setConfirmation] = createState<PowerItem | null>(null);
  const [confirmationMotion, setConfirmationMotion] = createState(false);
  const [errorMessage, setErrorMessage] = createState('');
  const transitionTimers = new Set<Timer>();
  let hideTimer: Timer | null = null;
  let focusTimer: Timer | null = null;
  let executing = false;
  let disposed = false;
  let transitioning = false;
  let lastMoveAt = 0;
  let confirmationSelectedIndex = 0;

  function cancelHideTimer() {
    hideTimer?.cancel();
    hideTimer = null;
  }

  function cancelFocusTimer() {
    focusTimer?.cancel();
    focusTimer = null;
  }

  function scheduleFocus(callback: () => void) {
    cancelFocusTimer();
    focusTimer = idle(() => {
      focusTimer = null;
      callback();
    });
  }

  function scheduleTransition(callback: () => void, delay: number) {
    const transitionTimer = timeout(delay, () => {
      transitionTimers.delete(transitionTimer);
      callback();
    });
    transitionTimers.add(transitionTimer);
  }

  function clearConfirmationTransition() {
    for (const timer of transitionTimers) timer.cancel();
    transitionTimers.clear();
    transitioning = false;
    setConfirmationMotion(false);
  }

  function canMoveSelection() {
    const now = GLib.get_monotonic_time();
    if (now - lastMoveAt < MOVE_INTERVAL_US) return false;
    lastMoveAt = now;
    return true;
  }

  function focusItem(index: number) {
    const nextIndex = (index + POWER_ITEMS.length) % POWER_ITEMS.length;
    setSelectedIndex(nextIndex);
    focusItemWidget(nextIndex);
  }

  function moveItemSelection(delta: number) {
    if (canMoveSelection()) focusItem(selectedIndex() + delta);
  }

  function moveConfirmationSelection() {
    if (!canMoveSelection()) return;
    confirmationSelectedIndex = confirmationSelectedIndex === 0 ? 1 : 0;
    focusConfirmation(confirmationSelectedIndex);
  }

  function hideAnimated() {
    if (executing) return;
    clearConfirmationTransition();
    cancelFocusTimer();
    setRevealed(false);
    setConfirmation(null);
    setErrorMessage('');
    confirmationSelectedIndex = 0;

    deactivateSidePanel('power-menu', monitorConnector);

    cancelHideTimer();
    hideTimer = timeout(shellMotion.panelDuration, () => {
      hideTimer = null;
      setVisible(false);
    });
  }

  function showAnimated() {
    clearConfirmationTransition();
    cancelHideTimer();
    lastMoveAt = 0;
    confirmationSelectedIndex = 0;
    setConfirmation(null);
    setErrorMessage('');
    setSelectedIndex(0);
    setVisible(true);
    setRevealed(true);
    scheduleFocus(() => focusItem(0));
  }

  async function runAction(item: PowerItem) {
    if (executing) return;
    executing = true;
    setErrorMessage('');
    setRevealed(false);

    try {
      await executePowerAction(item.action);
      if (disposed) return;
      setVisible(false);
      deactivateSidePanel('power-menu', monitorConnector);
    } catch (error) {
      if (disposed) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[PowerMenu] ${item.label} failed: ${message}`);
      const active = activeSidePanel.get();
      if (active.panel !== 'power-menu' || active.monitor !== monitorConnector) return;
      setConfirmation(null);
      setErrorMessage(`${item.label} failed: ${message}`);
      setVisible(true);
      setRevealed(true);
      activateSidePanel('power-menu', monitorConnector ?? '');
      scheduleFocus(() => focusItem(POWER_ITEMS.indexOf(item)));
    } finally {
      executing = false;
    }
  }

  function beginConfirmation(item: PowerItem) {
    if (transitioning) return;
    transitioning = true;
    setErrorMessage('');
    confirmationSelectedIndex = 0;
    focusItem(POWER_ITEMS.indexOf(item));
    setConfirmationMotion(true);

    scheduleTransition(() => {
      setConfirmation(item);
      scheduleTransition(() => {
        setConfirmationMotion(false);
        transitioning = false;
        lastMoveAt = 0;
        focusConfirmation(0);
      }, CONFIRM_FADE_MS);
    }, CONFIRM_MOVE_MS);
  }

  function requestAction(item: PowerItem) {
    if (transitioning) return;
    if (item.dangerous) beginConfirmation(item);
    else void runAction(item);
  }

  function confirmAction() {
    const item = confirmation();
    if (item) void runAction(item);
  }

  function selectItem(index: number) {
    setSelectedIndex(index);
  }

  function selectConfirmation(index: number) {
    confirmationSelectedIndex = index;
  }

  function handleKey(keyval: number) {
    if (transitioning) return true;
    if (keyval === Gdk.KEY_Escape) {
      hideAnimated();
      return true;
    }

    const confirmationItem = confirmation();
    if (confirmationItem) {
      if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Right) {
        moveConfirmationSelection();
        return true;
      }

      const typed = Gdk.keyval_to_unicode(keyval);
      if (typed > 0 && String.fromCodePoint(typed).toLowerCase() === confirmationItem.shortcut) {
        void runAction(confirmationItem);
        return true;
      }
      return false;
    }

    if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Up) {
      moveItemSelection(-1);
      return true;
    }
    if (keyval === Gdk.KEY_Right || keyval === Gdk.KEY_Down) {
      moveItemSelection(1);
      return true;
    }

    const typed = Gdk.keyval_to_unicode(keyval);
    if (typed <= 0) return false;
    const shortcut = String.fromCodePoint(typed).toLowerCase();
    const item = POWER_ITEMS.find(candidate => candidate.shortcut === shortcut);
    if (!item) return false;

    focusItem(POWER_ITEMS.indexOf(item));
    requestAction(item);
    return true;
  }

  onCleanup(() => {
    disposed = true;
    cancelHideTimer();
    cancelFocusTimer();
    clearConfirmationTransition();
    deactivateSidePanel('power-menu', monitorConnector);
  });

  return {
    visible,
    revealed,
    selectedIndex,
    confirmation,
    confirmationMotion,
    errorMessage,
    showAnimated,
    hideAnimated,
    requestAction,
    confirmAction,
    selectItem,
    selectConfirmation,
    handleKey,
  };
}
