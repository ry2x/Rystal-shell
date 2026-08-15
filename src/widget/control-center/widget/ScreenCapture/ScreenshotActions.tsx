import { Gtk } from 'ags/gtk4';

import { captureScreenshot } from '../../../../stores/screenCapture';
import { LucideIcon } from '../../../common/lucide';

export default function ScreenshotActions() {
  return (
    <>
      <box spacing={8} halign={Gtk.Align.START}>
        <LucideIcon name="fullscreen" pixelSize={20} class="color-primary" />
        <label label="Screenshot" css="font-weight: 700; font-size: 1.1em;" />
      </box>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} homogeneous>
        <button
          class="power-btn"
          onClicked={() => captureScreenshot('crop')}
          tooltipText="Crop Region"
        >
          <box spacing={8} halign={Gtk.Align.CENTER}>
            <LucideIcon name="crop" pixelSize={18} class="color-secondary" />
            <label label="Crop" css="font-size: 0.9em;" />
          </box>
        </button>
        <button
          class="power-btn"
          onClicked={() => captureScreenshot('freeze')}
          tooltipText="Interactive Freeze"
        >
          <box spacing={8} halign={Gtk.Align.CENTER}>
            <LucideIcon name="snowflake" pixelSize={18} class="color-tertiary" />
            <label label="Freeze" css="font-size: 0.9em;" />
          </box>
        </button>
        <button
          class="power-btn"
          onClicked={() => captureScreenshot('monitor')}
          tooltipText="Monitor"
        >
          <box spacing={8} halign={Gtk.Align.CENTER}>
            <LucideIcon name="monitor" pixelSize={18} class="color-primary" />
            <label label="Monitor" css="font-size: 0.9em;" />
          </box>
        </button>
      </box>
    </>
  );
}
