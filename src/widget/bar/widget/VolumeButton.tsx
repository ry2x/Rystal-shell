import { createBinding } from 'ags';
import { Gdk, Gtk } from 'ags/gtk4';

import Wp from 'gi://AstalWp';

import { adjustVolume } from '../../../stores/audio';
import { toggleControlCenter } from '../../../stores/windowManager';
import { LucideIcon } from '../../../widget/common/lucide';

export interface VolumeButtonProps {
  speaker: Wp.Endpoint;
  monitor: Gdk.Monitor;
}

function getVolumeIcon(icon: string) {
  if (icon.includes('muted')) return 'volume-x';
  if (icon.includes('high')) return 'volume-2';
  if (icon.includes('medium')) return 'volume-1';
  if (icon.includes('low')) return 'volume';
  return 'volume-x';
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
          <label label="%" css="font-size: 0.85em;" />
        </box>
      </box>
    </button>
  );
}
