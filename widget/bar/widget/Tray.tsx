import { For, createBinding } from 'ags';
import { Gtk } from 'ags/gtk4';

import AstalTray from 'gi://AstalTray';

function isFcitxItem(item: AstalTray.TrayItem) {
  return item.id.toLowerCase().includes('fcitx');
}

function TrayItemButton({
  item,
  onActivate,
}: {
  item: AstalTray.TrayItem;
  onActivate: () => void;
}) {
  const button = (
    <menubutton
      class="tray-item"
      hasFrame={false}
      tooltipMarkup={createBinding(item, 'tooltip_markup')}
    >
      <image gicon={createBinding(item, 'gicon')} pixelSize={18} />
    </menubutton>
  ) as Gtk.MenuButton;

  const menu = Gtk.PopoverMenu.new_from_model(item.menu_model);
  menu.set_has_arrow(false);
  menu.set_position(Gtk.PositionType.RIGHT);
  menu.add_css_class('tray-item-menu');
  button.set_popover(menu);

  const updateActionGroup = () => button.insert_action_group('dbusmenu', item.action_group);
  updateActionGroup();
  const actionGroupHook = item.connect('notify::action-group', updateActionGroup);
  button.connect('destroy', () => item.disconnect(actionGroupHook));

  const leftClick = new Gtk.GestureClick({ button: 1 });
  leftClick.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
  leftClick.connect('pressed', (gesture) => {
    gesture.set_state(Gtk.EventSequenceState.CLAIMED);
    item.activate(0, 0);
    onActivate();
  });
  button.add_controller(leftClick);

  const rightClick = new Gtk.GestureClick({ button: 3 });
  rightClick.connect('pressed', () => button.popup());
  button.add_controller(rightClick);

  return button;
}

export default function Tray() {
  const tray = AstalTray.get_default();
  const items = createBinding(tray, 'items');
  const primaryItem = items.as((list) => list.find(isFcitxItem) ?? list[0] ?? null);

  let expander: Gtk.Popover | null = null;

  const trigger = (
    <button
      class="tray-primary"
      tooltipMarkup={primaryItem.as((item) => item?.tooltip_markup ?? '')}
      onClicked={() => {
        if (expander?.get_visible()) expander.popdown();
        else expander?.popup();
      }}
    >
      <For each={primaryItem.as((item) => (item ? [item] : []))}>
        {(item: AstalTray.TrayItem) => (
          <image gicon={createBinding(item, 'gicon')} pixelSize={18} />
        )}
      </For>
    </button>
  ) as Gtk.Button;

  const expandedItems = (
    <box class="tray-expander-row" orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
      <For each={items}>
        {(item: AstalTray.TrayItem) => (
          <TrayItemButton item={item} onActivate={() => expander?.popdown()} />
        )}
      </For>
    </box>
  ) as Gtk.Box;

  expander = new Gtk.Popover();
  expander.set_has_arrow(false);
  expander.set_position(Gtk.PositionType.RIGHT);
  expander.add_css_class('tray-expander');
  expander.set_child(expandedItems);
  expander.set_parent(trigger);
  trigger.connect('destroy', () => expander?.unparent());

  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      transitionDuration={250}
      revealChild={primaryItem.as((item) => item !== null)}
    >
      <box class="Tray" orientation={Gtk.Orientation.VERTICAL}>
        {trigger}
      </box>
    </revealer>
  );
}
