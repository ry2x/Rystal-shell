import { type Accessor } from 'ags';
import { Gtk } from 'ags/gtk4';

import type { PowerItem } from '../../../stores/powerMenu';
import { LucideIcon } from '../../common/lucide';

export interface PowerMenuConfirmationViewProps {
  confirmation: Accessor<PowerItem | null>;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectionChanged: (index: number) => void;
  onCancelButtonCreated: (button: Gtk.Button) => void;
  onConfirmButtonCreated: (button: Gtk.Button) => void;
}

export default function PowerMenuConfirmationView({
  confirmation,
  onCancel,
  onConfirm,
  onSelectionChanged,
  onCancelButtonCreated,
  onConfirmButtonCreated,
}: PowerMenuConfirmationViewProps) {
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
          <button class="power-menu-cancel" onClicked={onCancel} $={onCancelButtonCreated}>
            <Gtk.EventControllerFocus onEnter={() => onSelectionChanged(0)} />
            <label label="Cancel (<u>ESC</u>)" useMarkup />
          </button>
          <button class="power-menu-confirm" onClicked={onConfirm} $={onConfirmButtonCreated}>
            <Gtk.EventControllerFocus onEnter={() => onSelectionChanged(1)} />
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
