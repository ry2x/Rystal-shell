import {createEffect} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {shellGeometry} from '@/lib/shellGeometry';
import {createPowerMenuState} from '@/stores/panel/powerMenu';
import ClickCatcher from '@/widget/common/ClickCatcher';
import PowerMenuConfirmationView from '@/widget/power-menu/widget/PowerMenuConfirmationView';
import PowerMenuMainView from '@/widget/power-menu/widget/PowerMenuMainView';

const CONFIRM_FADE_MS = 180;

export interface PowerMenuProps {
  monitor: Gdk.Monitor;
}

type PowerMenuWindow = Astal.Window & {
  hide_animated: () => void;
  show_animated: () => void;
};

export default function PowerMenu({monitor}: PowerMenuProps) {
  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;
  const itemButtons: Gtk.Button[] = [];
  let cancelButton: Gtk.Button | null = null;
  let confirmButton: Gtk.Button | null = null;

  const state = createPowerMenuState({
    monitorConnector: monitor.get_connector(),
    focusItem: index => itemButtons[index]?.grab_focus(),
    focusConfirmation: index => {
      if (index === 0) cancelButton?.grab_focus();
      else confirmButton?.grab_focus();
    },
  });

  const mainView = PowerMenuMainView({
    selectedIndex: state.selectedIndex,
    confirmationMotion: state.confirmationMotion,
    errorMessage: state.errorMessage,
    onRequestAction: state.requestAction,
    onItemFocused: state.selectItem,
    onButtonCreated: (index, button) => {
      itemButtons[index] = button;
    },
  });

  const confirmationView = PowerMenuConfirmationView({
    confirmation: state.confirmation,
    onCancel: state.hideAnimated,
    onConfirm: state.confirmAction,
    onSelectionChanged: state.selectConfirmation,
    onCancelButtonCreated: button => {
      cancelButton = button;
    },
    onConfirmButtonCreated: button => {
      confirmButton = button;
    },
  });

  const stack = (
    <stack
      transitionType={Gtk.StackTransitionType.CROSSFADE}
      transitionDuration={CONFIRM_FADE_MS}
      hexpand
      vexpand
      halign={Gtk.Align.FILL}
      valign={Gtk.Align.FILL}
      $={self => {
        self.add_named(mainView, 'main');
        self.add_named(confirmationView, 'confirmation');
        createEffect(() => {
          self.set_visible_child_name(state.confirmation() ? 'confirmation' : 'main');
        });
      }}
    />
  ) as Gtk.Stack;

  const window = (
    <window
      name={`power-menu-${monitor.get_connector()}`}
      class="PowerMenu"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.EXCLUSIVE}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={shellGeometry.barWidth}
      application={app}
      visible={state.visible}
    >
      <Gtk.EventControllerKey
        propagationPhase={Gtk.PropagationPhase.CAPTURE}
        onKeyPressed={(_controller, keyval) => state.handleKey(keyval)}
      />
      <box orientation={Gtk.Orientation.VERTICAL}>
        <ClickCatcher onClick={state.hideAnimated} hexpand vexpand />
        <box
          cssClasses={state.revealed.as(revealed =>
            revealed ? ['power-menu-panel', 'revealed'] : ['power-menu-panel']
          )}
          heightRequest={shellGeometry.powerMenuPanelHeight}
          vexpand={false}
          vexpandSet
          valign={Gtk.Align.END}
          overflow={Gtk.Overflow.HIDDEN}
        >
          {stack}
        </box>
      </box>
    </window>
  ) as PowerMenuWindow;

  window.hide_animated = state.hideAnimated;
  window.show_animated = state.showAnimated;
  return window;
}
