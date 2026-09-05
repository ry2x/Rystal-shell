import {type Accessor, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import type {PowerItem} from '@/stores/panel/powerMenu';
import {LucideIcon} from '@/widget/common/lucide';

export interface PowerMenuConfirmationViewProps {
  confirmation: Accessor<PowerItem | null>;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectionChanged: (index: number) => void;
  register: (handle: PowerMenuConfirmationViewHandle | null) => void;
}

export interface PowerMenuConfirmationViewHandle {
  focusButton: (index: number) => void;
}

export default function PowerMenuConfirmationView({
  confirmation,
  onCancel,
  onConfirm,
  onSelectionChanged,
  register,
}: PowerMenuConfirmationViewProps) {
  let cancelButton: Gtk.Button | null = null;
  let confirmButton: Gtk.Button | null = null;
  const handle: PowerMenuConfirmationViewHandle = {
    focusButton: index => {
      if (index === 0) cancelButton?.grab_focus();
      else confirmButton?.grab_focus();
    },
  };
  onCleanup(() => register(null));

  return (
    <box
      name="confirmation"
      class="power-menu-confirmation"
      spacing={scaleUiSize(14)}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      $={() => register(handle)}
    >
      <box class="power-menu-confirmation-card">
        <box orientation={Gtk.Orientation.VERTICAL} hexpand vexpand>
          <box vexpand valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
            <LucideIcon name={confirmation.as(item => item?.icon ?? 'power')} pixelSize={54} />
          </box>
          <label
            class="power-menu-label"
            label={confirmation.as(item =>
              item ? `${item.label} (<u>${item.shortcut.toUpperCase()}</u>)` : ''
            )}
            useMarkup
          />
        </box>
      </box>
      <box class="power-menu-confirmation-body" spacing={scaleUiSize(28)}>
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={scaleUiSize(8)}
          hexpand
          valign={Gtk.Align.CENTER}
        >
          <label
            class="power-menu-confirmation-title"
            label={confirmation.as(item => (item ? `${item.label}?` : 'Confirm action'))}
            halign={Gtk.Align.START}
          />
          <label
            class="power-menu-confirmation-copy"
            label="Any unsaved work will be lost."
            halign={Gtk.Align.START}
          />
        </box>
        <box
          class="power-menu-confirmation-actions"
          valign={Gtk.Align.CENTER}
          spacing={scaleUiSize(14)}
        >
          <button
            class="power-menu-cancel"
            onClicked={onCancel}
            $={button => (cancelButton = button)}
          >
            <Gtk.EventControllerFocus onEnter={() => onSelectionChanged(0)} />
            <label label="Cancel (<u>ESC</u>)" useMarkup />
          </button>
          <button
            class="power-menu-confirm"
            onClicked={onConfirm}
            $={button => (confirmButton = button)}
          >
            <Gtk.EventControllerFocus onEnter={() => onSelectionChanged(1)} />
            <label
              label={confirmation.as(item =>
                item ? `${item.label} (<u>${item.shortcut.toUpperCase()}</u>)` : 'Confirm'
              )}
              useMarkup
            />
          </button>
        </box>
      </box>
    </box>
  );
}
