import Cairo from 'cairo';

import {onCleanup} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';
import {timeout} from 'ags/time';

import {type UiScaleContext} from '@/lib/uiScale';
import {BAR_DESIGN_WIDTH} from '@/stores/shell/barBackground';
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
  uiScale: UiScaleContext;
}

const INPUT_REGION_DELAY_MS = 500;

function setBarInputRegion(window: Astal.Window, uiScale: UiScaleContext) {
  const surface = window.get_native()?.get_surface();
  if (!surface) return;

  const region = new Cairo.Region();
  region.unionRectangle({
    x: 0,
    y: 0,
    width: uiScale.size(BAR_DESIGN_WIDTH) + uiScale.size(3),
    height: 9999,
  });
  surface.set_input_region(region);
}

export default function Bar({monitor, uiScale}: BarProps) {
  BarReserve({monitor, uiScale});

  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;
  const window = (
    <window
      visible
      name={`bar-${monitor.get_connector()}`}
      cssClasses={['Bar', uiScale.cssClass]}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      application={app}
    >
      <overlay hexpand vexpand>
        <PanelBackground uiScale={uiScale} />
        <box $type="overlay" halign={Gtk.Align.START}>
          <centerbox class="panel" orientation={Gtk.Orientation.VERTICAL}>
            <box
              $type="start"
              halign={Gtk.Align.FILL}
              valign={Gtk.Align.START}
              class="panel-start"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={uiScale.size(24)}
            >
              <Workspaces monitor={monitor} uiScale={uiScale} />
              <ScrollerIndicator monitor={monitor} />
            </box>
            <box
              $type="center"
              halign={Gtk.Align.FILL}
              valign={Gtk.Align.CENTER}
              class="panel-center"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={uiScale.size(8)}
            >
              <Weather monitor={monitor} />
              <Clock monitor={monitor} uiScale={uiScale} />
            </box>
            <box
              $type="end"
              halign={Gtk.Align.FILL}
              valign={Gtk.Align.END}
              class="panel-end"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={uiScale.size(8)}
            >
              <RecordIndicator uiScale={uiScale} />
              <Updates monitor={monitor} uiScale={uiScale} />
              <SysMetrics monitor={monitor} uiScale={uiScale} />
              <Volume monitor={monitor} uiScale={uiScale} />
              <Tray uiScale={uiScale} />
            </box>
          </centerbox>
        </box>
      </overlay>
    </window>
  ) as Astal.Window;

  const inputRegionTimer = timeout(INPUT_REGION_DELAY_MS, () => setBarInputRegion(window, uiScale));
  onCleanup(() => inputRegionTimer.cancel());

  return window;
}
