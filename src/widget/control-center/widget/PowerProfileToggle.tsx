import { createBinding } from 'ags';
import { Gtk } from 'ags/gtk4';

import Pango from 'gi://Pango';

import {
  cyclePowerProfile,
  getPowerIcon,
  getPowerLabel,
  getPowerProfile,
} from '../../../stores/powerProfile';
import { LucideIcon } from '../../../widget/common/lucide';

export default function PowerProfileToggle() {
  const power = getPowerProfile();
  if (!power) return <box visible={false} />;

  const activeProfile = createBinding(power, 'activeProfile');

  return (
    <box
      class={activeProfile.as(
        (profile) => `cc-toggle-btn ${profile === 'performance' ? 'active' : ''}`,
      )}
      spacing={0}
      css="padding: 0;"
    >
      <button
        hexpand
        class="cc-split-btn-left"
        css="padding: 16px; border-radius: 0.8em;"
        onClicked={cyclePowerProfile}
        tooltipText="Toggle Power Profile"
      >
        <box spacing={12}>
          <LucideIcon name={activeProfile.as(getPowerIcon)} class="icon" pixelSize={24} />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label
              label="Power Profile"
              css="font-weight: 700; font-size: 1.1em;"
              halign={Gtk.Align.START}
            />
            <label
              label={activeProfile.as(getPowerLabel)}
              css="font-size: 0.8em; opacity: 0.7;"
              halign={Gtk.Align.START}
              ellipsize={Pango.EllipsizeMode.END}
            />
          </box>
        </box>
      </button>
    </box>
  );
}
