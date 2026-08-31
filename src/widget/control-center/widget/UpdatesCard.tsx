import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {openUpdateManager, updatesPoll} from '@/stores/system/update';
import {LucideIcon} from '@/widget/common/lucide';

export interface UpdatesCardProps {
  uiScale: UiScaleContext;
}
export default function UpdatesCard({uiScale}: UpdatesCardProps) {
  const isAvailable = updatesPoll.as(u => parseInt(u) > 0);
  const labelText = updatesPoll.as(u => {
    const count = parseInt(u);
    return count > 0 ? `${count} Updates Available` : 'System is Up to Date';
  });

  return (
    <box
      class="cc-card"
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={uiScale.size(16)}
      hexpand
    >
      <LucideIcon name="package" pixelSize={24} class="icon updates-icon" uiScale={uiScale} />
      <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
        <label label="System Updates" class="cc-updates-title" halign={Gtk.Align.START} />
        <label label={labelText} class="cc-updates-status" halign={Gtk.Align.START} />
      </box>
      <button
        class="icon-btn"
        valign={Gtk.Align.CENTER}
        visible={isAvailable}
        onClicked={openUpdateManager}
      >
        <LucideIcon name="download" pixelSize={20} uiScale={uiScale} />
      </button>
    </box>
  );
}
