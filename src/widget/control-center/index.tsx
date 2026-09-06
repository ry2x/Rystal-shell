import {For} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {shellMotion} from '@/lib/motion';
import {shellGeometry} from '@/lib/shellGeometry';
import {createControlCenterState} from '@/stores/panel/controlCenter';
import ClickCatcher from '@/widget/common/ClickCatcher';
import ControlCenterPages from '@/widget/control-center/ControlCenterPages';

export interface ControlCenterProps {
  monitor: Gdk.Monitor;
}

export default function ControlCenter({monitor}: ControlCenterProps) {
  const connector = monitor.get_connector() ?? '';
  const state = createControlCenterState(connector);
  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;

  return (
    <window
      $={self => {
        Object.assign(self, {
          hide_animated: state.hideAnimated,
          hide_immediately: state.hideImmediately,
          show_animated: state.showAnimated,
        });
      }}
      name={`control-center-${monitor.get_connector()}`}
      class="ControlCenter"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={shellGeometry.barWidth}
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
  );
}
