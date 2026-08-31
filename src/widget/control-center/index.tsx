import {For} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {shellMotion} from '@/lib/motion';
import {scaleUiSize} from '@/lib/uiScale';
import {createControlCenterState} from '@/stores/panel/controlCenter';
import ClickCatcher from '@/widget/common/ClickCatcher';
import ControlCenterPages from '@/widget/control-center/ControlCenterPages';

export interface ControlCenterProps {
  monitor: Gdk.Monitor;
}

interface ControlCenterWindow extends Astal.Window {
  hide_animated: () => void;
  hide_immediately: () => void;
  show_animated: () => void;
}

export default function ControlCenter({monitor}: ControlCenterProps) {
  const connector = monitor.get_connector() ?? '';
  const state = createControlCenterState(connector);
  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;

  const window = (
    <window
      name={`control-center-${monitor.get_connector()}`}
      class="ControlCenter"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={scaleUiSize(47)}
      marginTop={0}
      keymode={Astal.Keymode.NONE}
      application={app}
      visible={state.visible}
    >
      <Gtk.EventControllerKey
        onKeyPressed={(_, keyval) => {
          if (keyval !== Gdk.KEY_Escape) return false;
          state.hideAnimated();
          return true;
        }}
      />
      <box orientation={Gtk.Orientation.VERTICAL}>
        <box orientation={Gtk.Orientation.HORIZONTAL} vexpand>
          <box hexpand={false} vexpand={false}>
            <For each={state.contentLoaded.as(loaded => (loaded ? [true] : []))}>
              {() => (
                <revealer
                  transitionType={Gtk.RevealerTransitionType.CROSSFADE}
                  transitionDuration={shellMotion.panelDuration}
                  revealChild={state.revealed}
                >
                  <box orientation={Gtk.Orientation.HORIZONTAL}>
                    <ControlCenterPages state={state} monitorConnector={connector} />
                  </box>
                </revealer>
              )}
            </For>
          </box>
          <ClickCatcher onClick={state.hideAnimated} hexpand />
        </box>
      </box>
    </window>
  ) as ControlCenterWindow;

  window.hide_animated = state.hideAnimated;
  window.hide_immediately = state.hideImmediately;
  window.show_animated = state.showAnimated;

  return window;
}
