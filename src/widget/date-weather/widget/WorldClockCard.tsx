import {Gtk} from 'ags/gtk4';

import {appConfig} from '@/lib/config';
import {scaleUiSize} from '@/lib/uiScale';
import WorldClockRow from '@/widget/date-weather/widget/WorldClockRow';

const WORLD_CLOCKS = appConfig.worldClocks;

export default function WorldClockCard() {
  return (
    <box
      class="world-clock-card widget-card"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={scaleUiSize(8)}
      hexpand
    >
      {WORLD_CLOCKS.map(({label, tz}) => (
        <WorldClockRow label={label} timeZone={tz} />
      ))}
    </box>
  );
}
