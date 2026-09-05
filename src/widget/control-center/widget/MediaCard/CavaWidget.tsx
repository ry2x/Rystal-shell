import Cairo from 'cairo';

import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUi, scaleUiSize} from '@/lib/uiScale';
import {acquireCava, isCavaAvailable} from '@/stores/media/cava';

const BAR_COUNT = 30;
const SENSITIVITY = 1.5;

class CavaDrawingSession {
  private session: ReturnType<typeof acquireCava> = null;
  private cachedColor = {r: 1, g: 1, b: 1, a: 0.15};
  private frameCount = 0;
  private disposed = false;
  private readonly mapSignalId: number;
  private readonly unmapSignalId: number;

  constructor(private readonly area: Gtk.DrawingArea) {
    this.mapSignalId = area.connect('map', () => this.activate());
    this.unmapSignalId = area.connect('unmap', () => this.deactivate());
    area.connect('destroy', () => this.dispose());
    area.set_draw_func((_area, context, width, height) => this.draw(context, width, height));
  }

  private activate() {
    if (this.session || this.disposed) return;
    this.session = acquireCava(() => this.area.queue_draw());
    this.area.queue_draw();
  }

  private deactivate() {
    this.session?.release();
    this.session = null;
  }

  private draw(context: Cairo.Context, width: number, height: number) {
    const values = this.session?.cava.values.slice(0, BAR_COUNT) ?? [];
    if (values.length === 0) return;

    const barWidth = width / values.length;
    const padding = scaleUi(2);

    if (this.frameCount % 60 === 0) {
      const color = this.area.get_style_context().get_color();
      this.cachedColor = {r: color.red, g: color.green, b: color.blue, a: 0.15};
    }
    this.frameCount++;

    const {r, g, b, a} = this.cachedColor;
    context.setSourceRGBA(r, g, b, a);

    for (let index = 0; index < values.length; index++) {
      const value = Math.min(values[index] * SENSITIVITY, 1);
      const barHeight = Math.max(value * height, scaleUi(2));
      context.rectangle(
        index * barWidth + padding / 2,
        height - barHeight,
        barWidth - padding,
        barHeight
      );
      context.fill();
    }

    if (typeof (context as {$dispose?: () => void}).$dispose === 'function') {
      (context as {$dispose: () => void}).$dispose();
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.deactivate();
    this.area.disconnect(this.mapSignalId);
    this.area.disconnect(this.unmapSignalId);
    this.area.set_draw_func(null);
  }
}

export default function CavaWidget() {
  if (!isCavaAvailable()) return <box visible={false} />;

  let drawingSession: CavaDrawingSession | null = null;
  onCleanup(() => {
    drawingSession?.dispose();
    drawingSession = null;
  });

  return (
    <box class="cava-visualizer" canTarget={false}>
      <drawingarea
        $={area => {
          drawingSession?.dispose();
          drawingSession = new CavaDrawingSession(area);
        }}
        hexpand
        valign={Gtk.Align.END}
        widthRequest={-1}
        heightRequest={scaleUiSize(160)}
      />
    </box>
  );
}
