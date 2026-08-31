import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import type {PowerItem} from '@/stores/panel/powerMenu';
import {LucideIcon} from '@/widget/common/lucide';

export interface PowerMenuItemButtonProps {
  item: PowerItem;
  index: number;
  selectedIndex: Accessor<number>;
  confirmationMotion: Accessor<boolean>;
  onRequestAction: (item: PowerItem) => void;
  onItemFocused: (index: number) => void;
  onButtonCreated: (index: number, button: Gtk.Button) => void;
  uiScale: UiScaleContext;
}

export default function PowerMenuItemButton({
  item,
  index,
  selectedIndex,
  confirmationMotion,
  onRequestAction,
  onItemFocused,
  onButtonCreated,
  uiScale,
}: PowerMenuItemButtonProps) {
  return (
    <button
      cssClasses={selectedIndex.as(selected =>
        selected === index ? ['power-menu-item', 'selected'] : ['power-menu-item']
      )}
      css={confirmationMotion.as(moving => {
        if (!moving) return '';
        if (selectedIndex() === index) {
          const offset = uiScale.value(123) - index * (uiScale.value(260) + uiScale.value(18));
          return `opacity: 1; transform: translateX(${offset}px) translateY(${uiScale.value(-5)}px);`;
        }
        return 'opacity: 0; transform: scale(0.92);';
      })}
      onClicked={() => onRequestAction(item)}
      $={self => onButtonCreated(index, self)}
    >
      <Gtk.EventControllerFocus onEnter={() => onItemFocused(index)} />
      <box orientation={Gtk.Orientation.VERTICAL} vexpand>
        <box vexpand valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
          <LucideIcon name={item.icon} pixelSize={54} uiScale={uiScale} />
        </box>
        <label
          class="power-menu-label"
          label={`${item.label} (<u>${item.shortcut.toUpperCase()}</u>)`}
          useMarkup
        />
      </box>
    </button>
  );
}
