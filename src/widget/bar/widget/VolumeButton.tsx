import { createBinding } from 'ags';
import { Gdk, Gtk } from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import { getVolumeIcon } from '../../../lib/audio';
import { toggleControlCenter } from '../../../stores/shell/windowManager';
import { adjustVolume } from '../../../stores/system/audio';
import { LucideIcon } from '../../../widget/common/lucide';

export interface VolumeButtonProps {
  speaker: Wp.Endpoint;
  monitor: Gdk.Monitor;
}

export function VolumeButton({ speaker, monitor }: VolumeButtonProps) {
  const volumeIcon = createBinding(speaker, 'volume_icon').as(getVolumeIcon);

  return (
    <button class="Volume" onClicked={() => toggleControlCenter(monitor.get_connector())}>
      <Gtk.EventControllerScroll
        flags={Gtk.EventControllerScrollFlags.VERTICAL}
        onScroll={(_, _deltaX, deltaY) => {
          if (deltaY > 0) adjustVolume(speaker, -0.05);
          else if (deltaY < 0) adjustVolume(speaker, 0.05);
          return true;
        }}
      />
      <box spacing={4} orientation={Gtk.Orientation.VERTICAL}>
        <LucideIcon name={volumeIcon} class="icon" />
        <box spacing={0} orientation={Gtk.Orientation.VERTICAL}>
          <label
            label={createBinding(speaker, 'volume').as((volume) => `${Math.round(volume * 100)}`)}
          />
          <label label="%" class="volume-unit" />
        </box>
      </box>
    </button>
  );
}
