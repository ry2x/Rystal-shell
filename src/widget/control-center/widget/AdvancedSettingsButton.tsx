import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';

export interface AdvancedSettingsButtonProps {
  title: string;
  subtitle: string;
  onOpen: () => void;
}

export default function AdvancedSettingsButton({
  title,
  subtitle,
  onOpen,
}: AdvancedSettingsButtonProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={scaleUiSize(12)}>
      <box class="cc-advanced-settings-header" spacing={scaleUiSize(8)}>
        <LucideIcon name="settings" pixelSize={17} />
        <label label="Advanced" class="cc-section-title" halign={Gtk.Align.START} />
      </box>
      <button
        class="cc-advanced-settings-button"
        hexpand
        halign={Gtk.Align.FILL}
        onClicked={onOpen}
      >
        <box spacing={scaleUiSize(12)} hexpand>
          <box orientation={Gtk.Orientation.VERTICAL} hexpand>
            <label label={title} halign={Gtk.Align.START} />
            <label
              label={subtitle}
              class="cc-advanced-settings-subtitle"
              halign={Gtk.Align.START}
            />
          </box>
          <LucideIcon name="chevron-right" pixelSize={20} />
        </box>
      </button>
    </box>
  );
}
