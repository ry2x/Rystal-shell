import {For, createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import AstalTray from 'gi://AstalTray';

import {scaleUiSize} from '@/lib/uiScale';
import {TrayItemButton} from '@/widget/bar/widget/TrayItemButton';

function isFcitxItem(item: AstalTray.TrayItem) {
  return item.id.toLowerCase().includes('fcitx');
}

export default function Tray() {
  const tray = AstalTray.get_default();
  const items = createBinding(tray, 'items');
  const primaryItem = items.as(list => list.find(isFcitxItem) ?? list[0] ?? null);

  let expander: Gtk.Popover | null = null;

  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      transitionDuration={250}
      revealChild={primaryItem.as(item => item !== null)}
    >
      <box class="Tray" orientation={Gtk.Orientation.VERTICAL}>
        <menubutton
          class="tray-primary"
          hasFrame={false}
          direction={Gtk.ArrowType.RIGHT}
          halign={Gtk.Align.CENTER}
          tooltipMarkup={primaryItem.as(item => item?.tooltip_markup ?? '')}
        >
          <For each={primaryItem.as(item => (item ? [item] : []))}>
            {(item: AstalTray.TrayItem) => (
              <image gicon={createBinding(item, 'gicon')} pixelSize={scaleUiSize(18)} />
            )}
          </For>
          <popover
            $={self => (expander = self)}
            hasArrow={false}
            position={Gtk.PositionType.RIGHT}
            cssClasses={['tray-expander']}
          >
            <box
              class="tray-expander-row"
              orientation={Gtk.Orientation.HORIZONTAL}
              spacing={scaleUiSize(4)}
            >
              <For each={items}>
                {(item: AstalTray.TrayItem) => (
                  <TrayItemButton item={item} onActivate={() => expander?.popdown()} />
                )}
              </For>
            </box>
          </popover>
        </menubutton>
      </box>
    </revealer>
  );
}
