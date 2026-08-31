import {createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Pango from 'gi://Pango';

import {type UiScaleContext} from '@/lib/uiScale';
import {
  cyclePowerProfile,
  getPowerIcon,
  getPowerLabel,
  getPowerProfile,
} from '@/stores/system/powerProfile';
import {LucideIcon} from '@/widget/common/lucide';

export interface PowerProfileToggleProps {
  uiScale: UiScaleContext;
}
export default function PowerProfileToggle({uiScale}: PowerProfileToggleProps) {
  const power = getPowerProfile();
  if (!power) return <box visible={false} />;

  const activeProfile = createBinding(power, 'activeProfile');

  return (
    <box
      class={activeProfile.as(
        profile => `cc-toggle-btn cc-single-toggle ${profile === 'performance' ? 'active' : ''}`
      )}
      spacing={0}
    >
      <button
        hexpand
        class="cc-toggle-button"
        onClicked={cyclePowerProfile}
        tooltipText="Toggle Power Profile"
      >
        <box spacing={uiScale.size(12)}>
          <LucideIcon
            name={activeProfile.as(getPowerIcon)}
            class="icon"
            pixelSize={24}
            uiScale={uiScale}
          />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label label="Power Profile" class="cc-toggle-title" halign={Gtk.Align.START} />
            <label
              label={activeProfile.as(getPowerLabel)}
              class="cc-toggle-status"
              halign={Gtk.Align.START}
              ellipsize={Pango.EllipsizeMode.END}
            />
          </box>
        </box>
      </button>
    </box>
  );
}
