import Cairo from 'cairo';

import {type Accessor, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';
import {type Timer, interval} from 'ags/time';

import GLib from 'gi://GLib';

import {shellMotion} from '@/lib/motion';
import {scaleUi, scaleUiSize} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';

export interface CircularProgressProps<T> {
  variable: Accessor<T>;
  transformer: (value: T) => number;
  icon: string;
  label: string;
  sublabel: string | Accessor<string>;
  cssClass: string;
}

const ANIMATION_INTERVAL_MS = 1000 / 60;
const LINE_WIDTH = scaleUi(6);

function normalize(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function createProgressGradient(
  centerX: number,
  centerY: number,
  radius: number,
  red: number,
  green: number,
  blue: number
) {
  const gradient = new Cairo.LinearGradient(
    centerX - radius,
    centerY - radius,
    centerX + radius,
    centerY + radius
  );
  gradient.addColorStopRGBA(0, red, green, blue, 0.72);
  gradient.addColorStopRGBA(0.44, red, green, blue, 0.96);
  gradient.addColorStopRGBA(0.52, 1, 1, 1, 0.88);
  gradient.addColorStopRGBA(0.6, red, green, blue, 0.9);
  gradient.addColorStopRGBA(1, red, green, blue, 0.62);
  return gradient;
}

class CircularProgressAnimation<T> {
  private currentValue: number;
  private startValue: number;
  private targetValue: number;
  private animationStartedAt = 0;
  private animationTimer: Timer | null = null;
  private readonly unsubscribe: () => void;
  private readonly mapSignal: number;
  private readonly unmapSignal: number;

  constructor(
    private readonly area: Gtk.DrawingArea,
    private readonly variable: Accessor<T>,
    private readonly transformer: (value: T) => number
  ) {
    this.currentValue = normalize(transformer(variable.peek()));
    this.startValue = this.currentValue;
    this.targetValue = this.currentValue;
    this.unsubscribe = variable.subscribe(() => this.updateValue());
    this.mapSignal = area.connect('map', () => this.handleMap());
    this.unmapSignal = area.connect('unmap', () => this.handleUnmap());
    area.set_draw_func((_area, context, width, height) => this.draw(context, width, height));
  }

  private animate() {
    const elapsed = (GLib.get_monotonic_time() - this.animationStartedAt) / 1000;
    const progress = Math.min(1, elapsed / shellMotion.metricDuration);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.currentValue = this.startValue + (this.targetValue - this.startValue) * eased;
    this.area.queue_draw();

    if (progress === 1) {
      this.animationTimer?.cancel();
      this.animationTimer = null;
    }
  }

  private updateValue() {
    this.targetValue = normalize(this.transformer(this.variable.peek()));

    if (!this.area.get_mapped()) {
      this.stopAnimation();
      this.syncCurrentValue();
      return;
    }

    this.startValue = this.currentValue;
    this.animationStartedAt = GLib.get_monotonic_time();
    this.animationTimer ??= interval(ANIMATION_INTERVAL_MS, () => this.animate());
  }

  private syncCurrentValue() {
    this.currentValue = this.targetValue;
    this.startValue = this.targetValue;
  }

  private stopAnimation() {
    this.animationTimer?.cancel();
    this.animationTimer = null;
  }

  private handleMap() {
    this.syncCurrentValue();
    this.area.queue_draw();
  }

  private handleUnmap() {
    this.stopAnimation();
    this.syncCurrentValue();
  }

  private draw(context: Cairo.Context, width: number, height: number) {
    const color = this.area.get_style_context().get_color();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - LINE_WIDTH;

    context.setSourceRGBA(color.red, color.green, color.blue, 0.15);
    context.setLineWidth(LINE_WIDTH);
    context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    context.stroke();

    if (this.currentValue <= 0) return;

    const progressGradient = createProgressGradient(
      centerX,
      centerY,
      radius,
      color.red,
      color.green,
      color.blue
    );
    context.setSource(progressGradient);
    context.setLineWidth(LINE_WIDTH);
    context.setLineCap(1);
    context.arc(
      centerX,
      centerY,
      radius,
      1.5 * Math.PI,
      1.5 * Math.PI + this.currentValue * 2 * Math.PI
    );
    context.stroke();
  }

  dispose() {
    this.unsubscribe();
    this.stopAnimation();
    this.area.disconnect(this.mapSignal);
    this.area.disconnect(this.unmapSignal);
    this.area.set_draw_func(null);
  }
}

export default function CircularProgress<T>({
  variable,
  transformer,
  icon,
  label,
  sublabel,
  cssClass,
}: CircularProgressProps<T>) {
  let area!: Gtk.DrawingArea;
  const areaWidget = (
    <drawingarea
      class={cssClass}
      contentWidth={scaleUiSize(120)}
      contentHeight={scaleUiSize(120)}
      widthRequest={scaleUiSize(120)}
      heightRequest={scaleUiSize(120)}
      $={self => (area = self)}
    />
  );
  const animation = new CircularProgressAnimation(area, variable, transformer);
  onCleanup(() => animation.dispose());

  return (
    <overlay>
      {areaWidget}
      <box
        $type="overlay"
        orientation={Gtk.Orientation.VERTICAL}
        valign={Gtk.Align.CENTER}
        halign={Gtk.Align.CENTER}
      >
        <box spacing={scaleUiSize(6)} valign={Gtk.Align.CENTER} class={cssClass}>
          <LucideIcon name={icon} pixelSize={14} />
          <label label={label} class="circular-progress-label" />
        </box>
        <label label={sublabel} class="circular-progress-sublabel" />
      </box>
    </overlay>
  );
}
