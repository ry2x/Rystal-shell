import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {POWER_ITEMS, type PowerItem} from '@/stores/panel/powerMenu';
import PowerMenuItemButton from '@/widget/power-menu/widget/PowerMenuItemButton';

export interface PowerMenuMainViewProps {
  selectedIndex: Accessor<number>;
  confirmationMotion: Accessor<boolean>;
  errorMessage: Accessor<string>;
  onRequestAction: (item: PowerItem) => void;
  onItemFocused: (index: number) => void;
  onButtonCreated: (index: number, button: Gtk.Button) => void;
  uiScale: UiScaleContext;
}

export default function PowerMenuMainView({
  selectedIndex,
  confirmationMotion,
  errorMessage,
  onRequestAction,
  onItemFocused,
  onButtonCreated,
  uiScale,
}: PowerMenuMainViewProps) {
  return (
    <box
      class="power-menu-main"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={uiScale.size(14)}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <box
        class="power-menu-items"
        spacing={uiScale.size(18)}
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
            onButtonCreated={onButtonCreated}
            uiScale={uiScale}
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
  ) as Gtk.Box;
}
