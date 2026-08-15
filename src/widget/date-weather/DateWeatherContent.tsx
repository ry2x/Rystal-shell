import { type Accessor } from 'ags';
import { Gtk } from 'ags/gtk4';

import { shellMotion } from '../../lib/motion';
import { createBarBackgroundGeometry } from '../../stores/shell/barBackground';
import ClockCard from './widget/ClockCard';
import NotificationList from './widget/NotificationList';
import ProfileCard from './widget/ProfileCard';
import WeatherCard from './widget/WeatherCard';
import WorldClockCard from './widget/WorldClockCard';

export interface DateWeatherContentProps {
  revealed: Accessor<boolean>;
  monitorConnector: string | null;
}

export default function DateWeatherContent({
  revealed,
  monitorConnector,
}: DateWeatherContentProps) {
  const geometry = createBarBackgroundGeometry(monitorConnector);

  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      transitionDuration={shellMotion.panelDuration}
      revealChild={revealed}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL}>
        <box
          cssClasses={revealed.as((isRevealed) =>
            isRevealed ? ['dw-container', 'revealed'] : ['dw-container'],
          )}
          css={geometry(({ dx }) => {
            const marginLeft = Math.max(-900, dx - 947);
            const opacity = Math.max(0, Math.min(1, (dx - 47) / 900));
            return `transform: translateX(${marginLeft}px); opacity: ${opacity};`;
          })}
          spacing={24}
          hexpand={false}
          vexpand
          valign={Gtk.Align.FILL}
          halign={Gtk.Align.START}
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={16} class="left-column">
            <ClockCard />
            <WorldClockCard />
            <WeatherCard />
            <box class="calendar-card widget-card" halign={Gtk.Align.FILL}>
              <Gtk.Calendar halign={Gtk.Align.CENTER} hexpand />
            </box>
            <ProfileCard />
          </box>

          <box class="vertical-sep" />
          <NotificationList />
        </box>
      </box>
    </revealer>
  );
}
