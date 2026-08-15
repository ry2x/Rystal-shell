import { type Accessor } from 'ags';
import { Gtk } from 'ags/gtk4';

import { LucideIcon } from '../../common/lucide';
import type { PowerItem } from '../items';

const CARD_OUTER_WIDTH = 260;
const CARD_GAP = 18;
const CONFIRMATION_FIRST_CARD_OFFSET = 123;

export interface PowerMenuItemButtonProps {
  item: PowerItem;
  index: number;
  selectedIndex: Accessor<number>;
  confirmationMotion: Accessor<boolean>;
  onRequestAction: (item: PowerItem) => void;
  onItemFocused: (index: number) => void;
  onButtonCreated: (index: number, button: Gtk.Button) => void;
}

export default function PowerMenuItemButton({
  item,
  index,
  selectedIndex,
  confirmationMotion,
  onRequestAction,
  onItemFocused,
  onButtonCreated,
}: PowerMenuItemButtonProps) {
  return (
    <button
      cssClasses={selectedIndex.as((selected) =>
        selected === index ? ['power-menu-item', 'selected'] : ['power-menu-item'],
      )}
      css={confirmationMotion.as((moving) => {
        if (!moving) return '';
        if (selectedIndex() === index) {
          const offset = CONFIRMATION_FIRST_CARD_OFFSET - index * (CARD_OUTER_WIDTH + CARD_GAP);
          return `opacity: 1; transform: translateX(${offset}px) translateY(-5px);`;
        }
        return 'opacity: 0; transform: scale(0.92);';
      })}
      onClicked={() => onRequestAction(item)}
      $={(self) => onButtonCreated(index, self)}
    >
      <Gtk.EventControllerFocus onEnter={() => onItemFocused(index)} />
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
  );
}
