import Cairo from 'cairo';

import {createEffect} from 'ags';
import {Gdk} from 'ags/gtk4';

import {
  type BarBackgroundGeometry,
  type BarColors,
  barColors,
  createBarBackgroundGeometry,
} from '@/stores/shell/barBackground';
import FrameDrawingArea from '@/widget/bar/FrameDrawingArea';
import {frameBorderWidth, getDesktopCutout} from '@/widget/bar/frameGeometry';

export interface PanelBackgroundProps {
  monitor: Gdk.Monitor;
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
  colors: BarColors
) {
  const [backgroundRed, backgroundGreen, backgroundBlue] = hexToRgba(colors.surface);
  // Match the SCSS surface-lightness check, including existing user themes.
  const backgroundLightness =
    (Math.max(backgroundRed, backgroundGreen, backgroundBlue) +
      Math.min(backgroundRed, backgroundGreen, backgroundBlue)) /
    2;
  const backgroundOpacity = backgroundLightness >= 0.5 ? 0.8 : 0.75;
  context.setAntialias(Cairo.Antialias.BEST);
  context.setOperator(Cairo.Operator.OVER);
  context.setSourceRGBA(backgroundRed, backgroundGreen, backgroundBlue, backgroundOpacity);
  context.rectangle(0, 0, width, height);
  context.fill();

  const cutout = getDesktopCutout(width, height, geometry);
  if (cutout) {
    const {x, y, width, height, radius} = cutout;
    const [accentRed, accentGreen, accentBlue, accentAlpha] = hexToRgba(colors.primary);
    context.newPath();
    context.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    context.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    context.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    context.arc(x + radius, y + radius, radius, Math.PI, (3 * Math.PI) / 2);
    context.closePath();

    context.setOperator(Cairo.Operator.CLEAR);
    context.fillPreserve();
    context.setOperator(Cairo.Operator.OVER);
    context.setSourceRGBA(accentRed, accentGreen, accentBlue, accentAlpha);
    context.setLineWidth(frameBorderWidth);
    context.stroke();
  }
  context.$dispose();
}

export default function PanelBackground({monitor}: PanelBackgroundProps) {
  const geometry = createBarBackgroundGeometry(monitor.get_connector());
  let drawingArea: InstanceType<typeof FrameDrawingArea> | null = null;

  createEffect(() => {
    geometry();
    barColors();
    drawingArea?.queue_draw();
  });

  return (
    <FrameDrawingArea
      hexpand
      vexpand
      canTarget={false}
      canFocus={false}
      sensitive={false}
      $={self => {
        drawingArea = self;
        self.geometry = geometry;
        self.set_draw_func((_area, context, width, height) => {
          drawBackground(context, width, height, geometry.peek(), barColors.peek());
        });
      }}
    />
  );
}
