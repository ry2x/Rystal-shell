import { Gtk } from 'ags/gtk4';

import {
  type CaffeineState,
  caffeineState,
  toggleCaffeine,
} from '../../../../stores/system/caffeine';
import { LucideIcon } from '../../../../widget/common/lucide';

function getCaffeineIcon(state: CaffeineState) {
  if (state === 'enabled') return 'coffee';
  if (state === 'remote') return 'server';
  return 'moon';
}

function getCaffeineLabel(state: CaffeineState) {
  if (state === 'enabled') return 'Active';
  if (state === 'remote') return 'Remote';
  return 'Inactive';
}

export default function CaffeineToggle() {
  return (
    <box
      class={caffeineState.as(
        (state) => `cc-toggle-btn cc-single-toggle ${state !== 'disabled' ? 'active' : ''}`,
      )}
      spacing={0}
    >
      <button
        hexpand
        class="cc-split-btn-left"
        onClicked={toggleCaffeine}
        tooltipText="Toggle Caffeine (Disabled -> Enabled -> Remote)"
      >
        <box spacing={12}>
          <LucideIcon name={caffeineState.as(getCaffeineIcon)} class="icon" pixelSize={24} />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label label="Caffeine" class="cc-toggle-title" halign={Gtk.Align.START} />
            <label
              label={caffeineState.as(getCaffeineLabel)}
              class="cc-toggle-status"
              halign={Gtk.Align.START}
            />
          </box>
        </box>
      </button>
    </box>
  );
}
