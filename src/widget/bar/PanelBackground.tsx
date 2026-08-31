import Cairo from 'cairo';

import {createEffect} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {
  type BarBackgroundGeometry,
  type BarColors,
  barColors,
  createBarBackgroundGeometry,
} from '@/stores/shell/barBackground';

export interface PanelBackgroundProps {
  uiScale: UiScaleContext;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const value = hex.replace('#', '');
  if (value.length !== 6 && value.length !== 8) return [0.1, 0.07, 0.08, 1];

  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
    parseInt(value.slice(6, 8) || 'ff', 16) / 255,
  ];
}

function drawBackground(
  context: Cairo.Context,
  width: number,
  height: number,
  geometry: BarBackgroundGeometry,
  colors: BarColors,
  uiScale: UiScaleContext
) {
  const [backgroundRed, backgroundGreen, backgroundBlue] = hexToRgba(colors.surface);
  const [accentRed, accentGreen, accentBlue, accentAlpha] = hexToRgba(colors.primary);
  const borderWidth = uiScale.value(3);
  const borderRadius = uiScale.value(16);
  const halfBorderWidth = borderWidth / 2;
  const desktopX = geometry.dx + halfBorderWidth;
  const desktopY = halfBorderWidth;
  const desktopWidth = width - geometry.dx - borderWidth;
  const desktopHeight = height - geometry.bottomHeight - borderWidth;

  context.setAntialias(Cairo.Antialias.BEST);
  context.setOperator(Cairo.Operator.OVER);
  context.setSourceRGBA(backgroundRed, backgroundGreen, backgroundBlue, 0.75);
  context.rectangle(0, 0, width, height);
  context.fill();

  context.newPath();
  context.arc(
    desktopX + desktopWidth - borderRadius,
    desktopY + borderRadius,
    borderRadius,
    -Math.PI / 2,
    0
  );
  context.arc(
    desktopX + desktopWidth - borderRadius,
    desktopY + desktopHeight - borderRadius,
    borderRadius,
    0,
    Math.PI / 2
  );
  context.arc(
    desktopX + borderRadius,
    desktopY + desktopHeight - borderRadius,
    borderRadius,
    Math.PI / 2,
    Math.PI
  );
  context.arc(
    desktopX + borderRadius,
    desktopY + borderRadius,
    borderRadius,
    Math.PI,
    (3 * Math.PI) / 2
  );
  context.closePath();

  context.setOperator(Cairo.Operator.CLEAR);
  context.fillPreserve();
  context.setOperator(Cairo.Operator.OVER);
  context.setSourceRGBA(accentRed, accentGreen, accentBlue, accentAlpha);
  context.setLineWidth(borderWidth);
  context.stroke();
  context.$dispose();
}

export default function PanelBackground({uiScale}: PanelBackgroundProps) {
  const geometry = createBarBackgroundGeometry(uiScale);
  let drawingArea!: Gtk.DrawingArea;

  const widget = (
    <drawingarea
      hexpand
      vexpand
      canTarget={false}
      canFocus={false}
      sensitive={false}
      $={self => {
        drawingArea = self;
        self.set_draw_func((_area, context, width, height) => {
          drawBackground(context, width, height, geometry.peek(), barColors.peek(), uiScale);
        });
      }}
    />
  ) as Gtk.DrawingArea;

  createEffect(() => {
    geometry();
    barColors();
    drawingArea.queue_draw();
  });

  return widget;
}
