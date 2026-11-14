import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import Gsk from 'gi://Gsk?version=4.0';

import {type BarBackgroundGeometry} from '@/stores/shell/barBackground';
import {getDesktopCutout} from '@/widget/bar/frameGeometry';

const supportsBackdrop = Gtk.check_version(4, 24, 0) === null;
const blurRadius = 20;

export default GObject.registerClass(
  {GTypeName: 'RystalShellFrameDrawingArea'},
  class FrameDrawingArea extends Gtk.DrawingArea {
    geometry: Accessor<BarBackgroundGeometry> | null = null;

    override vfunc_snapshot(snapshot: Gtk.Snapshot) {
      if (supportsBackdrop && this.geometry) {
        const width = this.get_width();
        const height = this.get_height();
        const bounds = new Graphene.Rect().init(0, 0, width, height);
        const frame = new Gsk.PathBuilder();
        frame.add_rect(bounds);

        const cutout = getDesktopCutout(width, height, this.geometry.peek());
        if (cutout) {
          const {x, y, width, height, radius} = cutout;
          const rect = new Graphene.Rect().init(x, y, width, height);
          frame.add_rounded_rect(new Gsk.RoundedRect().init_from_rect(rect, radius));
        }

        // GTK uses the filled path to derive the compositor's blur region in surface coordinates.
        snapshot.push_copy();
        snapshot.push_fill(frame.to_path(), Gsk.FillRule.EVEN_ODD);
        snapshot.push_blur(blurRadius);
        snapshot.append_paste(bounds, 0);
        snapshot.pop();
        snapshot.pop();
        snapshot.pop();
      }

      super.vfunc_snapshot(snapshot);
    }
  }
);
