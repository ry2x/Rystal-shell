import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {
  type CaffeineState,
  caffeineBusy,
  caffeineState,
  toggleCaffeine,
} from '@/stores/system/caffeine';
import {LucideIcon} from '@/widget/common/lucide';

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

export interface CaffeineToggleProps {
  uiScale: UiScaleContext;
}
export default function CaffeineToggle({uiScale}: CaffeineToggleProps) {
  return (
    <box
      class={caffeineState.as(
        state => `cc-toggle-btn cc-single-toggle ${state !== 'disabled' ? 'active' : ''}`
      )}
      spacing={0}
    >
      <button
        hexpand
        class="cc-toggle-button"
        sensitive={caffeineBusy.as(busy => !busy)}
        onClicked={() => void toggleCaffeine().catch(() => {})}
        tooltipText="Toggle Caffeine (Disabled -> Enabled -> Remote)"
      >
        <box spacing={uiScale.size(12)}>
          <LucideIcon
            name={caffeineState.as(getCaffeineIcon)}
            class="icon"
            pixelSize={24}
            uiScale={uiScale}
          />
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
