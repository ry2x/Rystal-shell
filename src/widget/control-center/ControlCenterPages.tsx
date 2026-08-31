import {For, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {shellMotion} from '@/lib/motion';
import {type UiScaleContext} from '@/lib/uiScale';
import {type ControlCenterState} from '@/stores/panel/controlCenter';
import {createBarBackgroundGeometry} from '@/stores/shell/barBackground';
import ControlCenterContent from '@/widget/control-center/ControlCenterContent';
import PageContainer from '@/widget/control-center/PageContainer';
import {BluetoothPage, WifiPage} from '@/widget/control-center/widget/Connectivity';
import {SoundPage} from '@/widget/control-center/widget/Sound';

export interface ControlCenterPagesProps {
  state: ControlCenterState;
  uiScale: UiScaleContext;
}

export default function ControlCenterPages({state, uiScale}: ControlCenterPagesProps) {
  const geometry = createBarBackgroundGeometry(uiScale);
  const mainContent = (
    <ControlCenterContent onOpenPage={state.openPage} uiScale={uiScale} />
  ) as Gtk.Widget;
  const main = (
    <PageContainer
      revealed={state.revealed}
      geometry={geometry}
      child={mainContent}
      uiScale={uiScale}
    />
  ) as Gtk.Widget;
  const wifi = (
    <PageContainer
      revealed={state.revealed}
      geometry={geometry}
      uiScale={uiScale}
      child={
        (
          <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
            <For each={state.wifiLoaded.as(loaded => (loaded ? [true] : []))}>
              {() => (
                <WifiPage
                  monitorConnector={uiScale.connector}
                  onBack={state.showMainPage}
                  uiScale={uiScale}
                />
              )}
            </For>
          </box>
        ) as Gtk.Widget
      }
    />
  ) as Gtk.Widget;
  const bluetooth = (
    <PageContainer
      revealed={state.revealed}
      geometry={geometry}
      uiScale={uiScale}
      child={
        (
          <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
            <For each={state.bluetoothLoaded.as(loaded => (loaded ? [true] : []))}>
              {() => (
                <BluetoothPage page={state.page} onBack={state.showMainPage} uiScale={uiScale} />
              )}
            </For>
          </box>
        ) as Gtk.Widget
      }
    />
  ) as Gtk.Widget;
  const sound = (
    <PageContainer
      revealed={state.revealed}
      geometry={geometry}
      uiScale={uiScale}
      child={
        (
          <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
            <For each={state.soundLoaded.as(loaded => (loaded ? [true] : []))}>
              {() => <SoundPage onBack={state.showMainPage} uiScale={uiScale} />}
            </For>
          </box>
        ) as Gtk.Widget
      }
    />
  ) as Gtk.Widget;

  let unsubscribePage: (() => void) | null = null;
  const stack = (
    <stack
      transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
      transitionDuration={shellMotion.pageDuration}
      $={(self: Gtk.Stack) => {
        self.add_named(main, 'main');
        self.add_named(wifi, 'wifi');
        self.add_named(bluetooth, 'bluetooth');
        self.add_named(sound, 'sound');
        self.set_visible_child_name(state.page.peek());
        unsubscribePage = state.page.subscribe(() => {
          self.set_visible_child_name(state.page.peek());
        });
      }}
    />
  ) as Gtk.Stack;

  onCleanup(() => unsubscribePage?.());
  return stack;
}
