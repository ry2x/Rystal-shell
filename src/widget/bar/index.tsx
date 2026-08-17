import Cairo from 'cairo';

import {onCleanup} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';
import {timeout} from 'ags/time';

import BarReserve from '@/widget/bar/BarReserve';
import PanelBackground from '@/widget/bar/PanelBackground';
import Clock from '@/widget/bar/widget/Clock';
import RecordIndicator from '@/widget/bar/widget/RecordIndicator';
import ScrollerIndicator from '@/widget/bar/widget/ScrollerIndicator';
import SysMetrics from '@/widget/bar/widget/SysMetrics';
import Tray from '@/widget/bar/widget/Tray';
import Updates from '@/widget/bar/widget/Updates';
import Volume from '@/widget/bar/widget/Volume';
import Weather from '@/widget/bar/widget/Weather';
import Workspaces from '@/widget/bar/widget/Workspaces';

export interface BarProps {
  monitor: Gdk.Monitor;
}

const BORDER_WIDTH = 3;
const BAR_WIDTH = 47;
const INPUT_REGION_DELAY_MS = 500;

function setBarInputRegion(window: Astal.Window) {
  const surface = window.get_native()?.get_surface();
  if (!surface) return;

  const region = new Cairo.Region();
  region.unionRectangle({
    x: 0,
    y: 0,
    width: BAR_WIDTH + BORDER_WIDTH,
    height: 9999,
  });
  surface.set_input_region(region);
}

export default function Bar({monitor}: BarProps) {
  BarReserve({monitor});

  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;
  const window = (
    <window
      visible
      name={`bar-${monitor.get_connector()}`}
      cssClasses={['Bar']}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      application={app}
    >
      <overlay hexpand vexpand>
        <PanelBackground monitor={monitor} />
        <box $type="overlay" halign={Gtk.Align.START}>
          <centerbox class="panel" orientation={Gtk.Orientation.VERTICAL}>
            <box
              $type="start"
              halign={Gtk.Align.FILL}
              valign={Gtk.Align.START}
              class="panel-start"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={24}
            >
              <Workspaces monitor={monitor} />
              <ScrollerIndicator monitor={monitor} />
            </box>
            <box
              $type="center"
              halign={Gtk.Align.FILL}
              valign={Gtk.Align.CENTER}
              class="panel-center"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={8}
            >
              <Weather monitor={monitor} />
              <Clock monitor={monitor} />
            </box>
            <box
              $type="end"
              halign={Gtk.Align.FILL}
              valign={Gtk.Align.END}
              class="panel-end"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={8}
            >
              <RecordIndicator />
              <Updates monitor={monitor} />
              <SysMetrics monitor={monitor} />
              <Volume monitor={monitor} />
              <Tray />
            </box>
          </centerbox>
        </box>
      </overlay>
    </window>
  ) as Astal.Window;

  const inputRegionTimer = timeout(INPUT_REGION_DELAY_MS, () => setBarInputRegion(window));
  onCleanup(() => inputRegionTimer.cancel());

  return window;
}
