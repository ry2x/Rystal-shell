import {For, createBinding, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import AstalTray from 'gi://AstalTray';

import {type UiScaleContext} from '@/lib/uiScale';
import {TrayItemButton} from '@/widget/bar/widget/TrayItemButton';

function isFcitxItem(item: AstalTray.TrayItem) {
  return item.id.toLowerCase().includes('fcitx');
}

export interface TrayProps {
  uiScale: UiScaleContext;
}

export default function Tray({uiScale}: TrayProps) {
  const tray = AstalTray.get_default();
  const items = createBinding(tray, 'items');
  const primaryItem = items.as(list => list.find(isFcitxItem) ?? list[0] ?? null);

  let expander: Gtk.Popover | null = null;

  const trigger = (
    <button
      class="tray-primary"
      halign={Gtk.Align.CENTER}
      tooltipMarkup={primaryItem.as(item => item?.tooltip_markup ?? '')}
      onClicked={() => {
        if (expander?.get_visible()) expander.popdown();
        else expander?.popup();
      }}
    >
      <For each={primaryItem.as(item => (item ? [item] : []))}>
        {(item: AstalTray.TrayItem) => (
          <image gicon={createBinding(item, 'gicon')} pixelSize={uiScale.size(18)} />
        )}
      </For>
    </button>
  ) as Gtk.Button;

  const expandedItems = (
    <box
      class="tray-expander-row"
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={uiScale.size(4)}
    >
      <For each={items}>
        {(item: AstalTray.TrayItem) => (
          <TrayItemButton item={item} onActivate={() => expander?.popdown()} uiScale={uiScale} />
        )}
      </For>
    </box>
  ) as Gtk.Box;

  expander = new Gtk.Popover({
    hasArrow: false,
    position: Gtk.PositionType.RIGHT,
    cssClasses: ['tray-expander'],
  });

  expander.set_parent(trigger);
  expander.set_child(expandedItems);

  onCleanup(() => expander?.unparent());

  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      transitionDuration={250}
      revealChild={primaryItem.as(item => item !== null)}
    >
      <box class="Tray" orientation={Gtk.Orientation.VERTICAL}>
        {trigger}
      </box>
    </revealer>
  );
}
