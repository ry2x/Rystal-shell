import {Gtk} from 'ags/gtk4';

import {appConfig} from '@/lib/config';
import {type UiScaleContext} from '@/lib/uiScale';
import WorldClockRow from '@/widget/date-weather/widget/WorldClockRow';

const WORLD_CLOCKS = appConfig.worldClocks;

export interface WorldClockCardProps {
  uiScale: UiScaleContext;
}
export default function WorldClockCard({uiScale}: WorldClockCardProps) {
  return (
    <box
      class="world-clock-card widget-card"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={uiScale.size(8)}
      hexpand
    >
      {WORLD_CLOCKS.map(({label, tz}) => (
        <WorldClockRow label={label} timeZone={tz} uiScale={uiScale} />
      ))}
    </box>
  );
}
