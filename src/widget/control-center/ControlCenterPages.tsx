import { For } from 'ags';
import { Gtk } from 'ags/gtk4';

import { shellMotion } from '../../lib/motion';
import { type ControlCenterState } from '../../stores/panel/controlCenter';
import ControlCenterContent from './ControlCenterContent';
import PageContainer from './PageContainer';
import { BluetoothPage, WifiPage } from './widget/Connectivity';
import { SoundPage } from './widget/Sound';

export interface ControlCenterPagesProps {
  state: ControlCenterState;
  monitorConnector: string;
}

export default function ControlCenterPages({ state, monitorConnector }: ControlCenterPagesProps) {
  const mainContent = (<ControlCenterContent onOpenPage={state.openPage} />) as Gtk.Widget;
  const main = (<PageContainer revealed={state.revealed} child={mainContent} />) as Gtk.Widget;
  const wifi = (
    <PageContainer
      revealed={state.revealed}
      child={
        (
          <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
            <For each={state.wifiLoaded.as((loaded) => (loaded ? [true] : []))}>
              {() => <WifiPage monitorConnector={monitorConnector} onBack={state.showMainPage} />}
            </For>
          </box>
        ) as Gtk.Widget
      }
    />
  ) as Gtk.Widget;
  const bluetooth = (
    <PageContainer
      revealed={state.revealed}
      child={
        (
          <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
            <For each={state.bluetoothLoaded.as((loaded) => (loaded ? [true] : []))}>
              {() => <BluetoothPage page={state.page} onBack={state.showMainPage} />}
            </For>
          </box>
        ) as Gtk.Widget
      }
    />
  ) as Gtk.Widget;
  const sound = (
    <PageContainer
      revealed={state.revealed}
      child={
        (
          <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
            <For each={state.soundLoaded.as((loaded) => (loaded ? [true] : []))}>
              {() => <SoundPage onBack={state.showMainPage} />}
            </For>
          </box>
        ) as Gtk.Widget
      }
    />
  ) as Gtk.Widget;

  return (
    <stack
      transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
      transitionDuration={shellMotion.pageDuration}
      visibleChildName={state.page}
      $={(self: Gtk.Stack) => {
        self.add_named(main, 'main');
        self.add_named(wifi, 'wifi');
        self.add_named(bluetooth, 'bluetooth');
        self.add_named(sound, 'sound');
      }}
    />
  );
}
