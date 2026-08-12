import { createState } from 'ags';
import { Astal, Gdk, Gtk } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import GLib from 'gi://GLib';

import { executePowerAction } from '../../stores/powerMenu';
import { activeSidePanel } from '../../stores/windowManager';
import { POWER_ITEMS, type PowerItem } from './items';
import { createPowerMenuConfirmationView, createPowerMenuMainView } from './widget/PowerMenuViews';

const BAR_WIDTH = 47;
const PANEL_HEIGHT = 350;
const HIDE_DELAY_MS = 300;
const CONFIRM_MOVE_MS = 300;
const CONFIRM_FADE_MS = 180;
const MOVE_INTERVAL_US = 83_333;

function ClickCatcher({ onClick }: { onClick: () => void }) {
  const box = (<box class="click-catcher" hexpand vexpand />) as Gtk.Box;
  const gesture = new Gtk.GestureClick();
  gesture.connect('pressed', onClick);
  box.add_controller(gesture);
  return box;
}

export default function PowerMenu(gdkmonitor: Gdk.Monitor) {
  const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor;
  const monitorConnector = gdkmonitor.get_connector();
  const windowName = `power-menu-${monitorConnector}`;
  const [isRevealed, setIsRevealed] = createState(false);
  const [selectedIndex, setSelectedIndex] = createState(0);
  const [confirmation, setConfirmation] = createState<PowerItem | null>(null);
  const [confirmationMotion, setConfirmationMotion] = createState(false);
  const [errorMessage, setErrorMessage] = createState('');

  const itemButtons: Gtk.Button[] = [];
  let cancelButton: Gtk.Button | null = null;
  let confirmButton: Gtk.Button | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let transitionTimeouts: ReturnType<typeof setTimeout>[] = [];
  let isExecuting = false;
  let isTransitioning = false;
  let lastMoveAt = 0;
  let confirmationSelectedIndex = 0;

  const canMoveSelection = () => {
    const now = GLib.get_monotonic_time();
    if (now - lastMoveAt < MOVE_INTERVAL_US) return false;
    lastMoveAt = now;
    return true;
  };

  const scheduleTransition = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      transitionTimeouts = transitionTimeouts.filter((candidate) => candidate !== timeout);
      callback();
    }, delay);
    transitionTimeouts.push(timeout);
  };

  const clearConfirmationTransition = () => {
    transitionTimeouts.forEach(clearTimeout);
    transitionTimeouts = [];
    isTransitioning = false;
    setConfirmationMotion(false);
  };

  const focusItem = (index: number) => {
    const next = (index + POWER_ITEMS.length) % POWER_ITEMS.length;
    setSelectedIndex(next);
    itemButtons[next]?.grab_focus();
  };

  const moveItemSelection = (delta: number) => {
    if (canMoveSelection()) focusItem(selectedIndex() + delta);
  };

  const moveConfirmationSelection = () => {
    if (!canMoveSelection()) return;
    confirmationSelectedIndex = confirmationSelectedIndex === 0 ? 1 : 0;
    if (confirmationSelectedIndex === 0) cancelButton?.grab_focus();
    else confirmButton?.grab_focus();
  };

  const hideAnimated = () => {
    if (isExecuting) return;
    clearConfirmationTransition();
    setIsRevealed(false);
    setConfirmation(null);
    setErrorMessage('');
    confirmationSelectedIndex = 0;
    if (
      activeSidePanel.get().panel === 'power-menu' &&
      activeSidePanel.get().monitor === monitorConnector
    ) {
      activeSidePanel.set('', '');
    }
    if (hideTimeout !== null) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      app.get_window(windowName)?.set_visible(false);
      hideTimeout = null;
    }, HIDE_DELAY_MS);
  };

  const showAnimated = () => {
    clearConfirmationTransition();
    lastMoveAt = 0;
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    setConfirmation(null);
    setErrorMessage('');
    setSelectedIndex(0);
    app.get_window(windowName)?.set_visible(true);
    setIsRevealed(true);
    setTimeout(() => focusItem(0), 0);
  };

  const runAction = async (item: PowerItem) => {
    if (isExecuting) return;
    isExecuting = true;
    setErrorMessage('');
    setIsRevealed(false);
    try {
      await executePowerAction(item.action);
      app.get_window(windowName)?.set_visible(false);
      if (activeSidePanel.get().panel === 'power-menu') activeSidePanel.set('', '');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[PowerMenu] ${item.label} failed: ${message}`);
      setConfirmation(null);
      setErrorMessage(`${item.label} failed: ${message}`);
      app.get_window(windowName)?.set_visible(true);
      setIsRevealed(true);
      activeSidePanel.set('power-menu', monitorConnector ?? '');
      setTimeout(() => focusItem(POWER_ITEMS.indexOf(item)), 0);
    } finally {
      isExecuting = false;
    }
  };

  const beginConfirmation = (item: PowerItem) => {
    if (isTransitioning) return;
    isTransitioning = true;
    setErrorMessage('');
    confirmationSelectedIndex = 0;
    focusItem(POWER_ITEMS.indexOf(item));
    setConfirmationMotion(true);

    scheduleTransition(() => {
      setConfirmation(item);
      scheduleTransition(() => {
        setConfirmationMotion(false);
        isTransitioning = false;
        lastMoveAt = 0;
        cancelButton?.grab_focus();
      }, CONFIRM_FADE_MS);
    }, CONFIRM_MOVE_MS);
  };

  const requestAction = (item: PowerItem) => {
    if (isTransitioning) return;
    if (item.dangerous) {
      beginConfirmation(item);
    } else {
      void runAction(item);
    }
  };

  const mainView = createPowerMenuMainView({
    selectedIndex,
    confirmationMotion,
    errorMessage,
    onRequestAction: requestAction,
    onItemFocused: setSelectedIndex,
    onButtonCreated: (index, button) => {
      itemButtons[index] = button;
    },
  });

  const confirmationView = createPowerMenuConfirmationView({
    confirmation,
    onCancel: hideAnimated,
    onConfirm: () => {
      const item = confirmation();
      if (item) void runAction(item);
    },
    onSelectionChanged: (index) => {
      confirmationSelectedIndex = index;
    },
    onCancelButtonCreated: (button) => {
      cancelButton = button;
    },
    onConfirmButtonCreated: (button) => {
      confirmButton = button;
    },
  });

  const stack = new Gtk.Stack({
    // Sliding a transparent Stack while the parent panel is transformed can leave a stale
    // Vulkan/GSK snapshot below the layer-shell window. Keep the horizontal confirmation
    // layout, but crossfade between views so every frame is composited in-place.
    transitionType: Gtk.StackTransitionType.CROSSFADE,
    transitionDuration: CONFIRM_FADE_MS,
    hexpand: true,
    vexpand: true,
    halign: Gtk.Align.FILL,
    valign: Gtk.Align.FILL,
  });
  stack.add_named(mainView, 'main');
  stack.add_named(confirmationView, 'confirmation');
  const updateConfirmationView = () =>
    stack.set_visible_child_name(confirmation() ? 'confirmation' : 'main');
  const unsubscribeConfirmation = confirmation.subscribe(updateConfirmationView);

  const win = (
    <window
      name={windowName}
      class="PowerMenu"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.EXCLUSIVE}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={BAR_WIDTH}
      application={app}
      visible={false}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <ClickCatcher onClick={hideAnimated} />
        <box
          cssClasses={isRevealed.as((revealed) =>
            revealed ? ['power-menu-panel', 'revealed'] : ['power-menu-panel'],
          )}
          heightRequest={PANEL_HEIGHT}
          vexpand={false}
          vexpandSet={true}
          valign={Gtk.Align.END}
          overflow={Gtk.Overflow.HIDDEN}
        >
          {stack}
        </box>
      </box>
    </window>
  ) as Astal.Window;

  Object.assign(win, { hide_animated: hideAnimated, show_animated: showAnimated });

  const keyController = new Gtk.EventControllerKey();
  keyController.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
  keyController.connect('key-pressed', (_controller, keyval) => {
    if (isTransitioning) return true;
    if (keyval === Gdk.KEY_Escape) {
      hideAnimated();
      return true;
    }

    if (confirmation()) {
      if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Right) {
        moveConfirmationSelection();
        return true;
      }

      const typed = Gdk.keyval_to_unicode(keyval);
      if (typed > 0 && String.fromCodePoint(typed).toLowerCase() === confirmation()?.shortcut) {
        const item = confirmation();
        if (item) void runAction(item);
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
    if (typed > 0) {
      const shortcut = String.fromCodePoint(typed).toLowerCase();
      const item = POWER_ITEMS.find((candidate) => candidate.shortcut === shortcut);
      if (item) {
        focusItem(POWER_ITEMS.indexOf(item));
        requestAction(item);
        return true;
      }
    }
    return false;
  });
  win.add_controller(keyController);

  win.connect('destroy', () => {
    unsubscribeConfirmation();
    clearConfirmationTransition();
    if (hideTimeout !== null) clearTimeout(hideTimeout);
  });

  return win;
}
