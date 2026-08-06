import { Gtk } from 'ags/gtk4';

import AstalCava from 'gi://AstalCava';

let cavaInstance: AstalCava.Cava | null = null;
let mappedWidgetCount = 0;

function getCava() {
  if (cavaInstance) return cavaInstance;

  cavaInstance = AstalCava.get_default();
  if (cavaInstance) cavaInstance.active = false;
  return cavaInstance;
}

export default function CavaWidget() {
  const cava = getCava();
  if (!cava) return <box visible={false} />;

  const area = new Gtk.DrawingArea();
  area.set_size_request(-1, 160);
  area.set_hexpand(true);
  area.set_valign(Gtk.Align.END);

  let valuesSignalId = 0;
  let isMapped = false;

  const syncMappedState = () => {
    const mapped = area.get_mapped();
    if (mapped === isMapped) return;

    isMapped = mapped;
    if (mapped) {
      mappedWidgetCount++;
      if (mappedWidgetCount === 1) cava.active = true;
      valuesSignalId = cava.connect('notify::values', () => area.queue_draw());
      area.queue_draw();
      return;
    }

    if (valuesSignalId !== 0) {
      cava.disconnect(valuesSignalId);
      valuesSignalId = 0;
    }
    mappedWidgetCount = Math.max(0, mappedWidgetCount - 1);
    if (mappedWidgetCount === 0) cava.active = false;
  };

  const mappedSignalId = area.connect('notify::mapped', syncMappedState);
  area.connect('destroy', () => {
    if (isMapped) {
      isMapped = false;
      mappedWidgetCount = Math.max(0, mappedWidgetCount - 1);
    }
    if (valuesSignalId !== 0) {
      cava.disconnect(valuesSignalId);
      valuesSignalId = 0;
    }
    if (mappedWidgetCount === 0) cava.active = false;
    area.disconnect(mappedSignalId);
  });

  let cachedColor = { r: 1, g: 1, b: 1, a: 0.15 };
  let frameCount = 0;

  area.set_draw_func((_area, cr, width, height) => {
    const vals = cava.values.slice(0, 30);
    if (vals.length === 0) return;

    const SENSITIVITY = 1.5;
    const barWidth = width / vals.length;
    const padding = 2;

    if (frameCount % 60 === 0) {
      const c = _area.get_style_context().get_color();
      cachedColor = { r: c.red, g: c.green, b: c.blue, a: 0.15 };
    }
    frameCount++;

    cr.setSourceRGBA(cachedColor.r, cachedColor.g, cachedColor.b, cachedColor.a);

    for (let i = 0; i < vals.length; i++) {
      const val = Math.min(vals[i] * SENSITIVITY, 1.0);
      const barHeight = Math.max(val * height, 2);
      cr.rectangle(i * barWidth + padding / 2, height - barHeight, barWidth - padding, barHeight);
      cr.fill();
    }

    if (typeof (cr as { $dispose?: () => void }).$dispose === 'function') {
      (cr as { $dispose: () => void }).$dispose();
    }
  });

  return (
    <box
      class="cava-visualizer"
      css="margin-left: 12px; margin-right: 12px; margin-bottom: 1px;"
      canTarget={false}
    >
      {area}
    </box>
  );
}
