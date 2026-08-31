import {Astal, Gdk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {type UiScaleContext} from '@/lib/uiScale';
import {BAR_DESIGN_WIDTH} from '@/stores/shell/barBackground';

export interface BarReserveProps {
  monitor: Gdk.Monitor;
  uiScale: UiScaleContext;
}

export default function BarReserve({monitor, uiScale}: BarReserveProps) {
  const {TOP, BOTTOM, LEFT} = Astal.WindowAnchor;

  return (
    <window
      visible
      name={`bar-reserve-${monitor.get_connector()}`}
      cssClasses={['BarReserve', uiScale.cssClass]}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      layer={Astal.Layer.BOTTOM}
      anchor={TOP | BOTTOM | LEFT}
      application={app}
    >
      <box widthRequest={uiScale.size(BAR_DESIGN_WIDTH) + uiScale.size(3)} />
    </window>
  );
}
