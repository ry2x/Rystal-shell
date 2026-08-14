import { Gtk } from 'ags/gtk4';

import GLib from 'gi://GLib';

import { shellMotion } from '../../lib/motion';
import { LucideIcon } from '../../widget/common/lucide';

export default function CircularProgress<T>({
  variable,
  transformer,
  icon,
  label,
  sublabel,
  cssClass,
}: {
  variable: { get: () => T; subscribe: (fn: () => void) => () => void };
  transformer: (v: T) => number;
  icon: string;
  label: string;
  sublabel: string | unknown;
  cssClass: string;
}) {
  const area = new Gtk.DrawingArea();
  area.add_css_class(cssClass);
  area.set_content_width(120);
  area.set_content_height(120);
  area.set_size_request(120, 120);

  const normalize = (value: number) =>
    Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

  let currentValue = normalize(transformer(variable.get()));
  let startValue = currentValue;
  let targetValue = currentValue;
  let animationStartedAt = 0;
  let animationSourceId = 0;

  const animate = () => {
    const elapsed = (GLib.get_monotonic_time() - animationStartedAt) / 1000;
    const progress = Math.min(1, elapsed / shellMotion.metricDuration);
    const eased = 1 - Math.pow(1 - progress, 3);
    currentValue = startValue + (targetValue - startValue) * eased;
    area.queue_draw();

    if (progress === 1) {
      animationSourceId = 0;
      return GLib.SOURCE_REMOVE;
    }
    return GLib.SOURCE_CONTINUE;
  };

  const updateValue = () => {
    targetValue = normalize(transformer(variable.get()));

    if (!area.get_mapped()) {
      if (animationSourceId !== 0) {
        GLib.source_remove(animationSourceId);
        animationSourceId = 0;
      }
      currentValue = targetValue;
      startValue = targetValue;
      return;
    }

    startValue = currentValue;
    animationStartedAt = GLib.get_monotonic_time();

    if (animationSourceId === 0) {
      animationSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000 / 60, animate);
    }
  };
  const unsubscribe = variable.subscribe(updateValue);

  const syncCurrentValue = () => {
    currentValue = targetValue;
    startValue = targetValue;
  };

  const mapSignalId = area.connect('map', () => {
    syncCurrentValue();
    area.queue_draw();
  });
  const unmapSignalId = area.connect('unmap', () => {
    if (animationSourceId !== 0) {
      GLib.source_remove(animationSourceId);
      animationSourceId = 0;
    }
    syncCurrentValue();
  });

  area.connect('destroy', () => {
    unsubscribe();
    if (animationSourceId !== 0) {
      GLib.source_remove(animationSourceId);
      animationSourceId = 0;
    }
    area.disconnect(mapSignalId);
    area.disconnect(unmapSignalId);
  });

  area.set_draw_func((_area, cr, width, height) => {
    const ctx = _area.get_style_context();
    const color = ctx.get_color();
    const r = color.red;
    const g = color.green;
    const b = color.blue;

    const center_x = width / 2;
    const center_y = height / 2;
    const radius = Math.min(width, height) / 2 - 6;

    cr.setSourceRGBA(r, g, b, 0.15);
    cr.setLineWidth(6);
    cr.arc(center_x, center_y, radius, 0, 2 * Math.PI);
    cr.stroke();

    if (currentValue > 0) {
      cr.setSourceRGBA(r, g, b, 1.0);
      cr.setLineWidth(6);
      cr.setLineCap(1); // ROUND
      cr.arc(center_x, center_y, radius, 1.5 * Math.PI, 1.5 * Math.PI + currentValue * 2 * Math.PI);
      cr.stroke();
    }
  });

  const textContainer = (
    <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
      <box spacing={6} valign={Gtk.Align.CENTER} class={cssClass}>
        <LucideIcon name={icon} pixelSize={14} />
        <label
          label={label}
          css={`
            font-weight: 800;
            font-size: 14px;
          `}
        />
      </box>
      <label
        label={sublabel as string}
        css="opacity: 0.7; font-weight: 700; font-size: 11px; margin-top: 2px;"
      />
    </box>
  );

  return (
    <overlay
      $={(self: Gtk.Overlay) => {
        self.add_overlay(textContainer as Gtk.Widget);
      }}
    >
      {area}
    </overlay>
  );
}
