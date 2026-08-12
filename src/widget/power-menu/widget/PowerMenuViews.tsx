import { createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import { LucideIcon } from '../../common/lucide';
import { POWER_ITEMS, type PowerItem } from '../items';

const CARD_OUTER_WIDTH = 260;
const CARD_GAP = 18;
const CONFIRMATION_FIRST_CARD_OFFSET = 123;

type State<T> = ReturnType<typeof createState<T>>[0];

interface MainViewProps {
  selectedIndex: State<number>;
  confirmationMotion: State<boolean>;
  errorMessage: State<string>;
  onRequestAction: (item: PowerItem) => void;
  onItemFocused: (index: number) => void;
  onButtonCreated: (index: number, button: Gtk.Button) => void;
}

export function createPowerMenuMainView({
  selectedIndex,
  confirmationMotion,
  errorMessage,
  onRequestAction,
  onItemFocused,
  onButtonCreated,
}: MainViewProps) {
  const makeItemButton = (item: PowerItem, index: number) => {
    const button = (
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
      >
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
    ) as Gtk.Button;
    const focusController = new Gtk.EventControllerFocus();
    focusController.connect('enter', () => onItemFocused(index));
    button.add_controller(focusController);
    onButtonCreated(index, button);
    return button;
  };

  return (
    <box
      class="power-menu-main"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={14}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <box
        class="power-menu-items"
        spacing={18}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        vexpand
      >
        {POWER_ITEMS.map(makeItemButton)}
      </box>
      <label
        cssClasses={errorMessage.as((message) =>
          message ? ['power-menu-error', 'visible'] : ['power-menu-error'],
        )}
        label={errorMessage}
        ellipsize={3}
      />
    </box>
  ) as Gtk.Box;
}

interface ConfirmationViewProps {
  confirmation: State<PowerItem | null>;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectionChanged: (index: number) => void;
  onCancelButtonCreated: (button: Gtk.Button) => void;
  onConfirmButtonCreated: (button: Gtk.Button) => void;
}

export function createPowerMenuConfirmationView({
  confirmation,
  onCancel,
  onConfirm,
  onSelectionChanged,
  onCancelButtonCreated,
  onConfirmButtonCreated,
}: ConfirmationViewProps) {
  const registerButton = (
    button: Gtk.Button,
    index: number,
    callback: (button: Gtk.Button) => void,
  ) => {
    callback(button);
    const focusController = new Gtk.EventControllerFocus();
    focusController.connect('enter', () => onSelectionChanged(index));
    button.add_controller(focusController);
  };

  return (
    <box
      class="power-menu-confirmation"
      spacing={14}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
    >
      <box class="power-menu-confirmation-card">
        <box orientation={Gtk.Orientation.VERTICAL} hexpand vexpand>
          <box vexpand valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
            <LucideIcon name={confirmation.as((item) => item?.icon ?? 'power')} pixelSize={54} />
          </box>
          <label
            class="power-menu-label"
            label={confirmation.as((item) =>
              item ? `${item.label} (<u>${item.shortcut.toUpperCase()}</u>)` : '',
            )}
            useMarkup
          />
        </box>
      </box>
      <box class="power-menu-confirmation-body" spacing={28}>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} hexpand valign={Gtk.Align.CENTER}>
          <label
            class="power-menu-confirmation-title"
            label={confirmation.as((item) => (item ? `${item.label}?` : 'Confirm action'))}
            halign={Gtk.Align.START}
          />
          <label
            class="power-menu-confirmation-copy"
            label="Any unsaved work will be lost."
            halign={Gtk.Align.START}
          />
        </box>
        <box class="power-menu-confirmation-actions" valign={Gtk.Align.CENTER} spacing={14}>
          <button
            class="power-menu-cancel"
            onClicked={onCancel}
            $={(self) => registerButton(self, 0, onCancelButtonCreated)}
          >
            <label label="Cancel (<u>ESC</u>)" useMarkup />
          </button>
          <button
            class="power-menu-confirm"
            onClicked={onConfirm}
            $={(self) => registerButton(self, 1, onConfirmButtonCreated)}
          >
            <label
              label={confirmation.as((item) =>
                item ? `${item.label} (<u>${item.shortcut.toUpperCase()}</u>)` : 'Confirm',
              )}
              useMarkup
            />
          </button>
        </box>
      </box>
    </box>
  ) as Gtk.Box;
}
