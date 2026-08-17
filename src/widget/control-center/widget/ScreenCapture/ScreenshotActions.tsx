import {Gtk} from 'ags/gtk4';

import {captureScreenshot} from '@/stores/capture/screenCapture';
import {LucideIcon} from '@/widget/common/lucide';

export default function ScreenshotActions() {
  return (
    <>
      <box spacing={8} halign={Gtk.Align.START}>
        <LucideIcon name="fullscreen" pixelSize={20} class="color-primary" />
        <label label="Screenshot" class="cc-capture-title" />
      </box>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} homogeneous>
        <button
          class="power-btn"
          onClicked={() => captureScreenshot('crop')}
          tooltipText="Crop Region"
        >
          <box spacing={8} halign={Gtk.Align.CENTER}>
            <LucideIcon name="crop" pixelSize={18} class="color-secondary" />
            <label label="Crop" class="cc-capture-action" />
          </box>
        </button>
        <button
          class="power-btn"
          onClicked={() => captureScreenshot('freeze')}
          tooltipText="Interactive Freeze"
        >
          <box spacing={8} halign={Gtk.Align.CENTER}>
            <LucideIcon name="snowflake" pixelSize={18} class="color-tertiary" />
            <label label="Freeze" class="cc-capture-action" />
          </box>
        </button>
        <button
          class="power-btn"
          onClicked={() => captureScreenshot('monitor')}
          tooltipText="Monitor"
        >
          <box spacing={8} halign={Gtk.Align.CENTER}>
            <LucideIcon name="monitor" pixelSize={18} class="color-primary" />
            <label label="Monitor" class="cc-capture-action" />
          </box>
        </button>
      </box>
    </>
  );
}
