import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import Pango from 'gi://Pango';

import {LucideIcon} from '@/widget/common/lucide';

export interface ErrorLabelProps {
  error: Accessor<string>;
  onRetry?: () => void;
}

export default function ErrorLabel({error, onRetry}: ErrorLabelProps) {
  return (
    <revealer
      revealChild={error.as(Boolean)}
      transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
    >
      <box class="cc-connectivity-error" spacing={8}>
        <LucideIcon name="circle-alert" pixelSize={18} class="cc-connectivity-error-icon" />
        <label
          label={error}
          class="cc-connectivity-error-message"
          wrap
          wrapMode={Pango.WrapMode.WORD_CHAR}
          maxWidthChars={32}
          hexpand
        />
        {onRetry && (
          <button class="cc-menu-btn" onClicked={onRetry}>
            <label label="Enter password" />
          </button>
        )}
      </box>
    </revealer>
  );
}
