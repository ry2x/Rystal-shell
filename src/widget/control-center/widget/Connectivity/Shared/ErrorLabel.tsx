import { type Accessor } from 'ags';
import { Gtk } from 'ags/gtk4';

import Pango from 'gi://Pango';

export interface ErrorLabelProps {
  error: Accessor<string>;
  onRetry?: () => void;
}

export default function ErrorLabel({ error, onRetry }: ErrorLabelProps) {
  return (
    <revealer
      revealChild={error.as(Boolean)}
      transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
    >
      <box class="cc-connectivity-error" spacing={8}>
        <label label={error} wrap wrapMode={Pango.WrapMode.WORD_CHAR} maxWidthChars={32} hexpand />
        {onRetry && (
          <button class="cc-menu-btn" onClicked={onRetry}>
            <label label="Enter password" />
          </button>
        )}
      </box>
    </revealer>
  );
}
