import {createBinding, createEffect} from 'ags';
import {Gtk} from 'ags/gtk4';

import AstalTray from 'gi://AstalTray';

import {type UiScaleContext} from '@/lib/uiScale';

export interface TrayItemButtonProps {
  item: AstalTray.TrayItem;
  onActivate: () => void;
  uiScale: UiScaleContext;
}

export function TrayItemButton({item, onActivate, uiScale}: TrayItemButtonProps) {
  const button = (
    <menubutton
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
      <Gtk.GestureClick button={3} onPressed={() => button.popup()} />
      <image gicon={createBinding(item, 'gicon')} pixelSize={uiScale.size(18)} />
    </menubutton>
  ) as Gtk.MenuButton;

  const menuModel = item.menu_model;
  const menu = menuModel
    ? Gtk.PopoverMenu.new_from_model_full(menuModel, Gtk.PopoverMenuFlags.NESTED)
    : new Gtk.Popover({
        child: (
          <label
            class="tray-menu-placeholder"
            label="No menu available"
            wrap
            justify={Gtk.Justification.CENTER}
          />
        ) as Gtk.Widget,
      });
  menu.set_has_arrow(false);
  menu.set_position(Gtk.PositionType.RIGHT);
  menu.add_css_class('tray-item-menu');
  button.set_popover(menu);

  if (menuModel) {
    const actionGroup = createBinding(item, 'action_group');
    createEffect(() => button.insert_action_group('dbusmenu', actionGroup()));
  }

  return button;
}
