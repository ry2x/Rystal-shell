import { createState } from 'ags';
import { Astal, Gdk, Gtk } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import type { PowerAction } from '../../stores/powerMenu';
import { executePowerAction } from '../../stores/powerMenu';
import { activeSidePanel } from '../../stores/windowManager';
import { LucideIcon } from '../common/lucide';

const BAR_WIDTH = 47;
const PANEL_HEIGHT = 350;
const HIDE_DELAY_MS = 300;

interface PowerItem {
  action: PowerAction;
  label: string;
  shortcut: string;
  icon: string;
  dangerous?: boolean;
}

const POWER_ITEMS: PowerItem[] = [
  { action: 'shutdown', label: 'Shutdown', shortcut: 'u', icon: 'power', dangerous: true },
  { action: 'reboot', label: 'Reboot', shortcut: 'r', icon: 'rotate-ccw', dangerous: true },
  { action: 'logout', label: 'Logout', shortcut: 'e', icon: 'log-out', dangerous: true },
  { action: 'sleep', label: 'Sleep', shortcut: 's', icon: 'moon' },
  { action: 'lock', label: 'Lock', shortcut: 'l', icon: 'lock' },
];

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
  const [errorMessage, setErrorMessage] = createState('');

  const itemButtons: Gtk.Button[] = [];
  let cancelButton: Gtk.Button | null = null;
  let confirmButton: Gtk.Button | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let isExecuting = false;

  const focusItem = (index: number) => {
    const next = (index + POWER_ITEMS.length) % POWER_ITEMS.length;
    setSelectedIndex(next);
    itemButtons[next]?.grab_focus();
  };

  const hideAnimated = () => {
    if (isExecuting) return;
    setIsRevealed(false);
    setConfirmation(null);
    setErrorMessage('');
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

  const requestAction = (item: PowerItem) => {
    if (item.dangerous) {
      setConfirmation(item);
      setErrorMessage('');
      setTimeout(() => cancelButton?.grab_focus(), 0);
    } else {
      void runAction(item);
    }
  };

  const makeItemButton = (item: PowerItem, index: number) => {
    const button = (
      <button
        cssClasses={selectedIndex.as((selected) =>
          selected === index ? ['power-menu-item', 'selected'] : ['power-menu-item'],
        )}
        onClicked={() => requestAction(item)}
      >
        <box orientation={Gtk.Orientation.VERTICAL} vexpand>
          <box vexpand valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
            <LucideIcon name={item.icon} pixelSize={54} />
          </box>
          <label
            class="power-menu-label"
            label={`${item.label} (<u>${item.shortcut.toUpperCase()}</u>)`}
            useMarkup
          />
        </box>
      </button>
    ) as Gtk.Button;
    const focusController = new Gtk.EventControllerFocus();
    focusController.connect('enter', () => setSelectedIndex(index));
    button.add_controller(focusController);
    itemButtons[index] = button;
    return button;
  };

  const mainView = (
    <box
      class="power-menu-main"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={14}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <box
        class="power-menu-items"
        spacing={18}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        vexpand
      >
        {POWER_ITEMS.map((item, index) => makeItemButton(item, index))}
      </box>
      <label
        cssClasses={errorMessage.as((message) =>
          message ? ['power-menu-error', 'visible'] : ['power-menu-error'],
        )}
        label={errorMessage}
        ellipsize={3}
      />
    </box>
  ) as Gtk.Box;

  const confirmationView = (
    <box class="power-menu-confirmation" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
      <box class="power-menu-confirmation-card">
        <box orientation={Gtk.Orientation.VERTICAL} hexpand vexpand>
          <box vexpand valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
            <LucideIcon name={confirmation.as((item) => item?.icon ?? 'power')} pixelSize={54} />
          </box>
          <label
            class="power-menu-label"
            label={confirmation.as((item) =>
              item ? `${item.label} (<u>${item.shortcut.toUpperCase()}</u>)` : '',
            )}
            useMarkup
          />
        </box>
      </box>
      <box class="power-menu-confirmation-body" spacing={28}>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} hexpand valign={Gtk.Align.CENTER}>
          <label
            class="power-menu-confirmation-title"
            label={confirmation.as((item) => (item ? `${item.label}?` : 'Confirm action'))}
            halign={Gtk.Align.START}
          />
          <label
            class="power-menu-confirmation-copy"
            label="Any unsaved work will be lost."
            halign={Gtk.Align.START}
          />
        </box>
        <box class="power-menu-confirmation-actions" valign={Gtk.Align.CENTER} spacing={14}>
          <button
            class="power-menu-cancel"
            onClicked={() => {
              setConfirmation(null);
              setTimeout(() => focusItem(selectedIndex()), 0);
            }}
            $={(self) => {
              cancelButton = self;
            }}
          >
            <label label="Cancel  ESC" />
          </button>
          <button
            class="power-menu-confirm"
            onClicked={() => {
              const item = confirmation();
              if (item) void runAction(item);
            }}
            $={(self) => {
              confirmButton = self;
            }}
          >
            <label label={confirmation.as((item) => (item ? `${item.label}  ↵` : 'Confirm  ↵'))} />
          </button>
        </box>
      </box>
    </box>
  ) as Gtk.Box;

  const stack = new Gtk.Stack({
    // Sliding a transparent Stack while the parent panel is transformed can leave a stale
    // Vulkan/GSK snapshot below the layer-shell window. Keep the horizontal confirmation
    // layout, but crossfade between views so every frame is composited in-place.
    transitionType: Gtk.StackTransitionType.CROSSFADE,
    transitionDuration: HIDE_DELAY_MS,
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
    if (keyval === Gdk.KEY_Escape) {
      if (confirmation()) {
        setConfirmation(null);
        setTimeout(() => focusItem(selectedIndex()), 0);
      } else {
        hideAnimated();
      }
      return true;
    }

    if (confirmation()) {
      if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Right) {
        if (cancelButton?.has_focus) confirmButton?.grab_focus();
        else cancelButton?.grab_focus();
        return true;
      }
      return false;
    }

    if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Up) {
      focusItem(selectedIndex() - 1);
      return true;
    }
    if (keyval === Gdk.KEY_Right || keyval === Gdk.KEY_Down) {
      focusItem(selectedIndex() + 1);
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
    if (hideTimeout !== null) clearTimeout(hideTimeout);
  });

  return win;
}
