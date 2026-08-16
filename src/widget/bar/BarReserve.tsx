import {Astal, Gdk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

const BORDER_WIDTH = 3;
const BAR_WIDTH = 47;

export interface BarReserveProps {
  monitor: Gdk.Monitor;
}

export default function BarReserve({monitor}: BarReserveProps) {
  const {TOP, BOTTOM, LEFT} = Astal.WindowAnchor;

  return (
    <window
      visible
      name={`bar-reserve-${monitor.get_connector()}`}
      cssClasses={['BarReserve']}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      layer={Astal.Layer.BOTTOM}
      anchor={TOP | BOTTOM | LEFT}
      application={app}
    >
      <box widthRequest={BAR_WIDTH + BORDER_WIDTH} />
    </window>
  );
}
