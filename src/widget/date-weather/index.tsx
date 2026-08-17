import {For} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {createDateWeatherPopupState} from '@/stores/panel/dateWeather';
import ClickCatcher from '@/widget/common/ClickCatcher';
import DateWeatherContent from '@/widget/date-weather/DateWeatherContent';

export interface DateWeatherPopupProps {
  monitor: Gdk.Monitor;
}

type DateWeatherWindow = Astal.Window & {
  hide_animated: () => void;
  show_animated: () => void;
};

export default function DateWeatherPopup({monitor}: DateWeatherPopupProps) {
  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;
  const connector = monitor.get_connector();
  const {visible, revealed, loaded, showAnimated, hideAnimated} =
    createDateWeatherPopupState(connector);

  const window = (
    <window
      name={`date-weather-popup-${connector}`}
      class="DateWeatherPopup"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={47}
      marginTop={0}
      keymode={Astal.Keymode.NONE}
      application={app}
      visible={visible}
    >
      <Gtk.EventControllerKey
        onKeyPressed={(_, keyval) => {
          if (keyval !== Gdk.KEY_Escape) return false;
          hideAnimated();
          return true;
        }}
      />
      <box orientation={Gtk.Orientation.VERTICAL}>
        <box orientation={Gtk.Orientation.HORIZONTAL} vexpand>
          <box hexpand={false} vexpand={false}>
            <For each={loaded.as(isLoaded => (isLoaded ? [true] : []))}>
              {() => <DateWeatherContent revealed={revealed} monitorConnector={connector} />}
            </For>
          </box>
          <ClickCatcher onClick={hideAnimated} hexpand />
        </box>
      </box>
    </window>
  ) as DateWeatherWindow;

  window.hide_animated = hideAnimated;
  window.show_animated = showAnimated;
  return window;
}
