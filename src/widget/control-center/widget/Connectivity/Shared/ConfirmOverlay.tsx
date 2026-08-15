import { createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import { type Confirmation } from './types';

export interface ConfirmOverlayProps {
  confirmation: Confirmation;
  clear: () => void;
  setError: (message: string) => void;
}

export default function ConfirmOverlay({ confirmation, clear, setError }: ConfirmOverlayProps) {
  const [busy, setBusy] = createState(false);

  return (
    <box class="cc-modal-backdrop" hexpand vexpand halign={Gtk.Align.FILL} valign={Gtk.Align.FILL}>
      <box
        class="cc-modal"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={12}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
      >
        <label
          label={confirmation.title}
          css="font-weight: 700; font-size: 1.05em;"
          halign={Gtk.Align.START}
        />
        <label label={confirmation.message} wrap halign={Gtk.Align.START} />
        <box spacing={8} halign={Gtk.Align.END}>
          <button class="power-btn" onClicked={clear} sensitive={busy.as((value) => !value)}>
            <label label="Cancel" />
          </button>
          <button
            class="power-btn cc-danger-btn"
            sensitive={busy.as((value) => !value)}
            onClicked={async () => {
              setBusy(true);
              try {
                await confirmation.onConfirm();
                clear();
              } catch (error) {
                setError(String(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label label={confirmation.confirmLabel} />
          </button>
        </box>
      </box>
    </box>
  );
}
