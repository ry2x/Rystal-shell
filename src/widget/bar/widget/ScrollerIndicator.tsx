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
            <LucideIcon name="app-window-mac" class="icon scroller-icon" />
            <label label={info.as(({ current }) => String(current))} class="scroller-count" />
            <box class="separator" halign={Gtk.Align.CENTER} />
            <label label={info.as(({ total }) => String(total))} class="scroller-count" />
          </box>
        </button>
      </box>
    </revealer>
  );
}
