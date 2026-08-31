import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {shellMotion} from '@/lib/motion';
import {type UiScaleContext} from '@/lib/uiScale';
import {
  BAR_DESIGN_WIDTH,
  DATE_WEATHER_PANEL_DESIGN_WIDTH,
  createBarBackgroundGeometry,
} from '@/stores/shell/barBackground';
import ClockCard from '@/widget/date-weather/widget/ClockCard';
import NotificationList from '@/widget/date-weather/widget/NotificationList';
import ProfileCard from '@/widget/date-weather/widget/ProfileCard';
import WeatherCard from '@/widget/date-weather/widget/WeatherCard';
import WorldClockCard from '@/widget/date-weather/widget/WorldClockCard';

export interface DateWeatherContentProps {
  revealed: Accessor<boolean>;
  uiScale: UiScaleContext;
}

export default function DateWeatherContent({revealed, uiScale}: DateWeatherContentProps) {
  const geometry = createBarBackgroundGeometry(uiScale);
  const barWidth = uiScale.size(BAR_DESIGN_WIDTH);
  const panelWidth = uiScale.size(DATE_WEATHER_PANEL_DESIGN_WIDTH);

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
            const marginLeft = Math.max(-panelWidth, dx - barWidth - panelWidth);
            const opacity = Math.max(0, Math.min(1, (dx - barWidth) / panelWidth));
            return `transform: translateX(${marginLeft}px); opacity: ${opacity};`;
          })}
          widthRequest={panelWidth}
          spacing={uiScale.size(24)}
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
            <box
              orientation={Gtk.Orientation.VERTICAL}
              spacing={uiScale.size(16)}
              class="left-column"
              marginStart={uiScale.size(12)}
              marginEnd={uiScale.size(12)}
            >
              <ClockCard uiScale={uiScale} />
              <WorldClockCard uiScale={uiScale} />
              <WeatherCard uiScale={uiScale} />
              <box class="calendar-card widget-card" halign={Gtk.Align.FILL}>
                <Gtk.Calendar halign={Gtk.Align.CENTER} hexpand />
              </box>
              <ProfileCard uiScale={uiScale} />
            </box>
          </scrolledwindow>

          <box class="vertical-sep" />
          <NotificationList uiScale={uiScale} />
        </box>
      </box>
    </revealer>
  );
}
