import {type Accessor, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {POWER_ITEMS, type PowerItem} from '@/stores/panel/powerMenu';
import PowerMenuItemButton from '@/widget/power-menu/widget/PowerMenuItemButton';

export interface PowerMenuMainViewProps {
  selectedIndex: Accessor<number>;
  confirmationMotion: Accessor<boolean>;
  errorMessage: Accessor<string>;
  onRequestAction: (item: PowerItem) => void;
  onItemFocused: (index: number) => void;
  register: (handle: PowerMenuMainViewHandle | null) => void;
}

export interface PowerMenuMainViewHandle {
  focusItem: (index: number) => void;
}

export default function PowerMenuMainView({
  selectedIndex,
  confirmationMotion,
  errorMessage,
  onRequestAction,
  onItemFocused,
  register,
}: PowerMenuMainViewProps) {
  const itemButtons: (Gtk.Button | null)[] = [];
  const handle: PowerMenuMainViewHandle = {
    focusItem: index => itemButtons[index]?.grab_focus(),
  };
  onCleanup(() => register(null));

  return (
    <box
      name="main"
      class="power-menu-main"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={scaleUiSize(14)}
      hexpand
      halign={Gtk.Align.FILL}
      $={() => register(handle)}
    >
      <box
        class="power-menu-items"
        spacing={scaleUiSize(18)}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        vexpand
      >
        {POWER_ITEMS.map((item, index) => (
          <PowerMenuItemButton
            item={item}
            index={index}
            selectedIndex={selectedIndex}
            confirmationMotion={confirmationMotion}
            onRequestAction={onRequestAction}
            onItemFocused={onItemFocused}
            register={button => (itemButtons[index] = button)}
          />
        ))}
      </box>
      <label
        cssClasses={errorMessage.as(message =>
          message ? ['power-menu-error', 'visible'] : ['power-menu-error']
        )}
        label={errorMessage}
        ellipsize={3}
      />
    </box>
  );
}
