import { Gdk, Gtk } from 'ags/gtk4';

import {
  createScrollingLayoutInfo,
  toggleScrollingOverview,
} from '../../../stores/scrollingLayout';
import { LucideIcon } from '../../../widget/common/lucide';

export interface ScrollerIndicatorProps {
  monitor: Gdk.Monitor;
}

export default function ScrollerIndicator({ monitor }: ScrollerIndicatorProps) {
  const info = createScrollingLayoutInfo(monitor.get_connector());

  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      transitionDuration={250}
      revealChild={info.as(({ visible }) => visible)}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <button class="ScrollerIndicator" onClicked={toggleScrollingOverview}>
          <box
            spacing={0}
            orientation={Gtk.Orientation.VERTICAL}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
          >
            <LucideIcon name="app-window-mac" class="icon" css="margin-bottom: 4px;" />
            <label label={info.as(({ current }) => String(current))} css="font-weight: 800;" />
            <box
              class="separator"
              halign={Gtk.Align.CENTER}
              css="min-height: 3px; min-width: 12px; margin: 2px 0; border-radius: 2px;"
            />
            <label label={info.as(({ total }) => String(total))} css="font-weight: 800;" />
          </box>
        </button>
      </box>
    </revealer>
  );
}
