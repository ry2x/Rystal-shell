import {For, createEffect} from 'ags';
import {Gtk} from 'ags/gtk4';

import {shellMotion} from '@/lib/motion';
import {type ControlCenterState} from '@/stores/panel/controlCenter';
import {createBarBackgroundGeometry} from '@/stores/shell/barBackground';
import ControlCenterContent from '@/widget/control-center/ControlCenterContent';
import PageContainer from '@/widget/control-center/PageContainer';
import {BluetoothPage, WifiPage} from '@/widget/control-center/widget/Connectivity';
import {SoundPage} from '@/widget/control-center/widget/Sound';

export interface ControlCenterPagesProps {
  state: ControlCenterState;
  monitorConnector: string;
}

export default function ControlCenterPages({state, monitorConnector}: ControlCenterPagesProps) {
  const geometry = createBarBackgroundGeometry(monitorConnector);

  return (
    <stack
      transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
      transitionDuration={shellMotion.pageDuration}
      $={self => {
        createEffect(() => {
          self.set_visible_child_name(state.page());
        });
      }}
    >
      <PageContainer $type="named" name="main" revealed={state.revealed} geometry={geometry}>
        <ControlCenterContent onOpenPage={state.openPage} />
      </PageContainer>
      <PageContainer $type="named" name="wifi" revealed={state.revealed} geometry={geometry}>
        <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
          <For each={state.wifiLoaded.as(loaded => (loaded ? [true] : []))}>
            {() => <WifiPage monitorConnector={monitorConnector} onBack={state.showMainPage} />}
          </For>
        </box>
      </PageContainer>
      <PageContainer $type="named" name="bluetooth" revealed={state.revealed} geometry={geometry}>
        <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
          <For each={state.bluetoothLoaded.as(loaded => (loaded ? [true] : []))}>
            {() => <BluetoothPage page={state.page} onBack={state.showMainPage} />}
          </For>
        </box>
      </PageContainer>
      <PageContainer $type="named" name="sound" revealed={state.revealed} geometry={geometry}>
        <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
          <For each={state.soundLoaded.as(loaded => (loaded ? [true] : []))}>
            {() => <SoundPage onBack={state.showMainPage} />}
          </For>
        </box>
      </PageContainer>
    </stack>
  );
}
