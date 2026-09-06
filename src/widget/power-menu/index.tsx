import {createEffect} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {shellGeometry} from '@/lib/shellGeometry';
import {createPowerMenuState} from '@/stores/panel/powerMenu';
import ClickCatcher from '@/widget/common/ClickCatcher';
import PowerMenuConfirmationView, {
  type PowerMenuConfirmationViewHandle,
} from '@/widget/power-menu/widget/PowerMenuConfirmationView';
import PowerMenuMainView, {
  type PowerMenuMainViewHandle,
} from '@/widget/power-menu/widget/PowerMenuMainView';

const CONFIRM_FADE_MS = 180;

export interface PowerMenuProps {
  monitor: Gdk.Monitor;
}

export default function PowerMenu({monitor}: PowerMenuProps) {
  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;
  let mainView: PowerMenuMainViewHandle | null = null;
  let confirmationView: PowerMenuConfirmationViewHandle | null = null;

  const state = createPowerMenuState({
    monitorConnector: monitor.get_connector(),
    focusItem: index => mainView?.focusItem(index),
    focusConfirmation: index => confirmationView?.focusButton(index),
  });

  return (
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
      $={self => {
        Object.assign(self, {
          hide_animated: state.hideAnimated,
          show_animated: state.showAnimated,
        });
      }}
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
          <stack
            transitionType={Gtk.StackTransitionType.CROSSFADE}
            transitionDuration={CONFIRM_FADE_MS}
            hexpand
            vexpand
            halign={Gtk.Align.FILL}
            valign={Gtk.Align.FILL}
            $={self => {
              createEffect(() => {
                self.set_visible_child_name(state.confirmation() ? 'confirmation' : 'main');
              });
            }}
          >
            <PowerMenuMainView
              $type="named"
              selectedIndex={state.selectedIndex}
              confirmationMotion={state.confirmationMotion}
              errorMessage={state.errorMessage}
              onRequestAction={state.requestAction}
              onItemFocused={state.selectItem}
              register={handle => (mainView = handle)}
            />
            <PowerMenuConfirmationView
              $type="named"
              confirmation={state.confirmation}
              onCancel={state.hideAnimated}
              onConfirm={state.confirmAction}
              onSelectionChanged={state.selectConfirmation}
              register={handle => (confirmationView = handle)}
            />
          </stack>
        </box>
      </box>
    </window>
  );
}
