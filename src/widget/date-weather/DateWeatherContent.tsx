import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {shellMotion} from '@/lib/motion';
import {DATE_WEATHER_PANEL_WIDTH, createBarBackgroundGeometry} from '@/stores/shell/barBackground';
import ClockCard from '@/widget/date-weather/widget/ClockCard';
import NotificationList from '@/widget/date-weather/widget/NotificationList';
import ProfileCard from '@/widget/date-weather/widget/ProfileCard';
import WeatherCard from '@/widget/date-weather/widget/WeatherCard';
import WorldClockCard from '@/widget/date-weather/widget/WorldClockCard';

export interface DateWeatherContentProps {
  revealed: Accessor<boolean>;
  monitorConnector: string | null;
}

export default function DateWeatherContent({revealed, monitorConnector}: DateWeatherContentProps) {
  const geometry = createBarBackgroundGeometry(monitorConnector);

  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      transitionDuration={shellMotion.panelDuration}
      revealChild={revealed}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL}>
        <box
          cssClasses={revealed.as(isRevealed =>
            isRevealed ? ['dw-container', 'revealed'] : ['dw-container']
          )}
          css={geometry(({dx}) => {
            const marginLeft = Math.max(
              -DATE_WEATHER_PANEL_WIDTH,
              dx - 47 - DATE_WEATHER_PANEL_WIDTH
            );
            const opacity = Math.max(0, Math.min(1, (dx - 47) / DATE_WEATHER_PANEL_WIDTH));
            return `transform: translateX(${marginLeft}px); opacity: ${opacity};`;
          })}
          widthRequest={DATE_WEATHER_PANEL_WIDTH}
          spacing={24}
          hexpand={false}
          vexpand
          valign={Gtk.Align.FILL}
          halign={Gtk.Align.START}
        >
          <scrolledwindow
            class="left-panel-scroll"
            hscrollbarPolicy={Gtk.PolicyType.NEVER}
            vscrollbarPolicy={Gtk.PolicyType.EXTERNAL}
            vexpand
            propagateNaturalHeight={false}
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
          </scrolledwindow>

          <box class="vertical-sep" />
          <NotificationList />
        </box>
      </box>
    </revealer>
  );
}
