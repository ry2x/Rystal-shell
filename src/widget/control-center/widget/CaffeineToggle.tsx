import { Gtk } from 'ags/gtk4';

import { type CaffeineState, caffeineState, toggleCaffeine } from '../../../stores/caffeine';
import { LucideIcon } from '../../../widget/common/lucide';

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
      class={caffeineState.as((state) => `cc-toggle-btn ${state !== 'disabled' ? 'active' : ''}`)}
      spacing={0}
      css="padding: 0;"
    >
      <button
        hexpand
        class="cc-split-btn-left"
        css="padding: 16px; border-radius: 0.8em;"
        onClicked={toggleCaffeine}
        tooltipText="Toggle Caffeine (Disabled -> Enabled -> Remote)"
      >
        <box spacing={12}>
          <LucideIcon name={caffeineState.as(getCaffeineIcon)} class="icon" pixelSize={24} />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label
              label="Caffeine"
              css="font-weight: 700; font-size: 1.1em;"
              halign={Gtk.Align.START}
            />
            <label
              label={caffeineState.as(getCaffeineLabel)}
              css="font-size: 0.8em; opacity: 0.7;"
              halign={Gtk.Align.START}
            />
          </box>
        </box>
      </button>
    </box>
  );
}
