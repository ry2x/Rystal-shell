import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type BarBackgroundGeometry} from '@/stores/shell/barBackground';

export interface FrameBlurProps {
  geometry: Accessor<BarBackgroundGeometry>;
  borderInset: number;
}

// Keep the strips outside the rectangular bounds of the rounded desktop cutout.
// GTK requests blur for each strip without including the desktop in that region.
export default function FrameBlur({geometry, borderInset}: FrameBlurProps) {
  const edge = Math.floor(borderInset);

  return (
    <box hexpand vexpand $={self => self.set_direction(Gtk.TextDirection.LTR)}>
      <box class="frame-blur" widthRequest={geometry.as(({dx}) => Math.floor(dx + borderInset))} />
      <box hexpand vexpand orientation={Gtk.Orientation.VERTICAL}>
        <box class="frame-blur" heightRequest={edge} />
        <box hexpand vexpand $={self => self.set_direction(Gtk.TextDirection.LTR)}>
          <box hexpand />
          <box class="frame-blur" widthRequest={edge} />
        </box>
        <box
          class="frame-blur"
          heightRequest={geometry.as(({bottomHeight}) => Math.floor(bottomHeight + borderInset))}
        />
      </box>
    </box>
  );
}
