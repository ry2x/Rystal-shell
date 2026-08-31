import {Gtk} from 'ags/gtk4';

import {scaleUi, scaleUiSize} from '@/lib/uiScale';
import {acquireCava, isCavaAvailable} from '@/stores/media/cava';

export default function CavaWidget() {
  if (!isCavaAvailable()) return <box visible={false} />;

  const area = new Gtk.DrawingArea({
    hexpand: true,
    valign: Gtk.Align.END,
    widthRequest: -1,
    heightRequest: scaleUiSize(160),
  });

  let session: ReturnType<typeof acquireCava> = null;

  const activate = () => {
    if (session) return;
    session = acquireCava(() => area.queue_draw());
    area.queue_draw();
  };

  const deactivate = () => {
    session?.release();
    session = null;
  };

  const mapSignalId = area.connect('map', activate);
  const unmapSignalId = area.connect('unmap', deactivate);
  area.connect('destroy', () => {
    deactivate();
    area.disconnect(mapSignalId);
    area.disconnect(unmapSignalId);
    area.set_draw_func(null);
  });

  let cachedColor = {r: 1, g: 1, b: 1, a: 0.15};
  let frameCount = 0;

  area.set_draw_func((_area, cr, width, height) => {
    const vals = session?.cava.values.slice(0, 30) ?? [];
    if (vals.length === 0) return;

    const SENSITIVITY = 1.5;
    const barWidth = width / vals.length;
    const padding = scaleUi(2);

    if (frameCount % 60 === 0) {
      const c = _area.get_style_context().get_color();
      cachedColor = {r: c.red, g: c.green, b: c.blue, a: 0.15};
    }
    frameCount++;

    cr.setSourceRGBA(cachedColor.r, cachedColor.g, cachedColor.b, cachedColor.a);

    for (let i = 0; i < vals.length; i++) {
      const val = Math.min(vals[i] * SENSITIVITY, 1.0);
      const barHeight = Math.max(val * height, scaleUi(2));
      cr.rectangle(i * barWidth + padding / 2, height - barHeight, barWidth - padding, barHeight);
      cr.fill();
    }

    if (typeof (cr as {$dispose?: () => void}).$dispose === 'function') {
      (cr as {$dispose: () => void}).$dispose();
    }
  });

  return (
    <box class="cava-visualizer" canTarget={false}>
      {area}
    </box>
  );
}
