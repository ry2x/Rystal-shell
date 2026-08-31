import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import Pango from 'gi://Pango';

import {type UiScaleContext} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';

export interface ErrorLabelProps {
  error: Accessor<string>;
  onRetry?: () => void;
  uiScale: UiScaleContext;
}

export default function ErrorLabel({error, onRetry, uiScale}: ErrorLabelProps) {
  return (
    <revealer
      revealChild={error.as(Boolean)}
      transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
    >
      <box class="cc-connectivity-error" spacing={uiScale.size(8)}>
        <LucideIcon
          name="circle-alert"
          pixelSize={18}
          class="cc-connectivity-error-icon"
          uiScale={uiScale}
        />
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
