import {createBinding, createEffect} from 'ags';
import {Gtk} from 'ags/gtk4';

import AstalTray from 'gi://AstalTray';

import {scaleUiSize} from '@/lib/uiScale';

export interface TrayItemButtonProps {
  item: AstalTray.TrayItem;
  onActivate: () => void;
}

export function TrayItemButton({item, onActivate}: TrayItemButtonProps) {
  const menuModel = item.menu_model;
  const menu = menuModel
    ? Gtk.PopoverMenu.new_from_model_full(menuModel, Gtk.PopoverMenuFlags.NESTED)
    : null;

  menu?.set_has_arrow(false);
  menu?.set_position(Gtk.PositionType.RIGHT);
  menu?.add_css_class('tray-item-menu');

  const actionGroup = menuModel ? createBinding(item, 'action_group') : null;
  let button: Gtk.MenuButton | null = null;

  return (
    <menubutton
      $={self => {
        button = self;
        if (actionGroup) {
          createEffect(() => self.insert_action_group('dbusmenu', actionGroup()));
        }
      }}
      class="tray-item"
      hasFrame={false}
      direction={Gtk.ArrowType.LEFT}
      tooltipMarkup={createBinding(item, 'tooltip_markup')}
    >
      <Gtk.GestureClick
        button={1}
        propagationPhase={Gtk.PropagationPhase.CAPTURE}
        onPressed={gesture => {
          gesture.set_state(Gtk.EventSequenceState.CLAIMED);
          item.activate(0, 0);
          onActivate();
        }}
      />
      <Gtk.GestureClick button={3} onPressed={() => button?.popup()} />
      <image gicon={createBinding(item, 'gicon')} pixelSize={scaleUiSize(18)} />
      {menu ?? (
        <popover hasArrow={false} position={Gtk.PositionType.RIGHT} cssClasses={['tray-item-menu']}>
          <label
            class="tray-menu-placeholder"
            label="No menu available"
            wrap
            justify={Gtk.Justification.CENTER}
          />
        </popover>
      )}
    </menubutton>
  );
}
