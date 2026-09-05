import {type Accessor, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUi} from '@/lib/uiScale';
import type {PowerItem} from '@/stores/panel/powerMenu';
import {LucideIcon} from '@/widget/common/lucide';

const CARD_OUTER_WIDTH = scaleUi(260);
const CARD_GAP = scaleUi(18);
const CONFIRMATION_FIRST_CARD_OFFSET = scaleUi(123);

export interface PowerMenuItemButtonProps {
  item: PowerItem;
  index: number;
  selectedIndex: Accessor<number>;
  confirmationMotion: Accessor<boolean>;
  onRequestAction: (item: PowerItem) => void;
  onItemFocused: (index: number) => void;
  register: (button: Gtk.Button | null) => void;
}

export default function PowerMenuItemButton({
  item,
  index,
  selectedIndex,
  confirmationMotion,
  onRequestAction,
  onItemFocused,
  register,
}: PowerMenuItemButtonProps) {
  onCleanup(() => register(null));

  return (
    <button
      cssClasses={selectedIndex.as(selected =>
        selected === index ? ['power-menu-item', 'selected'] : ['power-menu-item']
      )}
      css={confirmationMotion.as(moving => {
        if (!moving) return '';
        if (selectedIndex() === index) {
          const offset = CONFIRMATION_FIRST_CARD_OFFSET - index * (CARD_OUTER_WIDTH + CARD_GAP);
          return `opacity: 1; transform: translateX(${offset}px) translateY(${scaleUi(-5)}px);`;
        }
        return 'opacity: 0; transform: scale(0.92);';
      })}
      onClicked={() => onRequestAction(item)}
      $={register}
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
