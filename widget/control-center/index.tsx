import { For, createState } from 'ags';
import { Astal, Gdk, Gtk } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import { LucideIcon } from '../../lib/lucide';
import { shellMotion } from '../../lib/motion';
import { activeSidePanel, animDx } from '../../services/windowManager';
import BrightnessSlider from './widget/BrightnessSlider';
import { BluetoothPage, ControlCenterPage, WifiPage } from './widget/Connectivity';
import MediaCard from './widget/MediaCard/index';
import QuickToggles from './widget/QuickToggles';
import ScreenCapture from './widget/ScreenCapture';
import { SoundPage } from './widget/Sound';
import SystemMetrics from './widget/SystemMetrics';
import UpdatesCard from './widget/UpdatesCard';
import VolumeSlider from './widget/VolumeSlider';

interface ClickCatcherProps {
  onClick: () => void;
  hexpand?: boolean;
  vexpand?: boolean;
  heightRequest?: number;
  widthRequest?: number;
}

function ClickCatcher({
  onClick,
  hexpand = false,
  vexpand = false,
  heightRequest = -1,
  widthRequest = -1,
}: ClickCatcherProps) {
  const box = (
    <box
      class="click-catcher"
      hexpand={hexpand}
      vexpand={vexpand}
      heightRequest={heightRequest}
      widthRequest={widthRequest}
    />
  ) as Gtk.Box;
  const gesture = new Gtk.GestureClick();
  gesture.connect('pressed', onClick);
  box.add_controller(gesture);
  return box;
}

function Lazy({
  build,
  register,
}: {
  build: () => Gtk.Widget;
  register: (initialize: () => void) => void;
}) {
  // Intentionally load once and retain the widget tree while hidden. Rebuilding
  // it on every open caused cumulative GTK/GSK, Cava, and MPRIS allocations.
  const [loaded, setLoaded] = createState(false);
  register(() => setLoaded(true));

  return (
    <box>
      <For each={loaded.as((isLoaded) => (isLoaded ? [true] : []))}>{() => build()}</For>
    </box>
  ) as Gtk.Box;
}

type PageState = ReturnType<typeof createState<ControlCenterPage>>[0];
type SetPage = ReturnType<typeof createState<ControlCenterPage>>[1];

function ControlCenterPages({
  isRevealed,
  page,
  setPage,
  monitorConnector,
}: {
  isRevealed: ReturnType<typeof createState<boolean>>[0];
  page: PageState;
  setPage: SetPage;
  monitorConnector: string;
}) {
  const makeContainer = (child: Gtk.Widget) => {
    child.set_hexpand(true);
    child.set_halign(Gtk.Align.FILL);

    return (
      <box
        cssClasses={isRevealed.as((revealed) =>
          revealed ? ['cc-container', 'revealed'] : ['cc-container'],
        )}
        css={animDx((dx) => {
          const marginLeft = dx - 537;
          const opacity = Math.max(0, Math.min(1, (dx - 47) / 490));
          return `transform: translateX(${marginLeft < -490 ? -490 : marginLeft}px); opacity: ${opacity};`;
        })}
        orientation={Gtk.Orientation.VERTICAL}
        spacing={16}
        hexpand
        vexpand
        valign={Gtk.Align.FILL}
        halign={Gtk.Align.FILL}
      >
        {child}
      </box>
    ) as Gtk.Box;
  };

  const [wifiLoaded, setWifiLoaded] = createState(false);
  const [bluetoothLoaded, setBluetoothLoaded] = createState(false);
  const [soundLoaded, setSoundLoaded] = createState(false);

  const openPage = (target: Exclude<ControlCenterPage, 'main'>) => {
    if (target === 'wifi') setWifiLoaded(true);
    else if (target === 'bluetooth') setBluetoothLoaded(true);
    else setSoundLoaded(true);
    setPage(target);
  };

  return (
    <stack
      transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
      transitionDuration={shellMotion.pageDuration}
      $={(self: Gtk.Stack) => {
        const main = makeContainer(
          (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={16}>
              <box spacing={12} halign={Gtk.Align.START}>
                <LucideIcon name="settings-2" pixelSize={24} />
                <label label="Control Center" class="cc-title" />
              </box>

              <QuickToggles
                onOpenWifi={() => openPage('wifi')}
                onOpenBluetooth={() => openPage('bluetooth')}
              />
              <VolumeSlider onOpenSound={() => openPage('sound')} />
              <BrightnessSlider />
              <MediaCard />

              <box orientation={Gtk.Orientation.HORIZONTAL} spacing={16}>
                <SystemMetrics />
              </box>

              <UpdatesCard />
              <ScreenCapture />
            </box>
          ) as Gtk.Widget,
        );
        const wifi = makeContainer(
          (
            <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
              <For each={wifiLoaded.as((loaded) => (loaded ? [true] : []))}>
                {() => (
                  <WifiPage monitorConnector={monitorConnector} onBack={() => setPage('main')} />
                )}
              </For>
            </box>
          ) as Gtk.Widget,
        );
        const bluetooth = makeContainer(
          (
            <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
              <For each={bluetoothLoaded.as((loaded) => (loaded ? [true] : []))}>
                {() => <BluetoothPage page={page} onBack={() => setPage('main')} />}
              </For>
            </box>
          ) as Gtk.Widget,
        );
        const sound = makeContainer(
          (
            <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.FILL}>
              <For each={soundLoaded.as((loaded) => (loaded ? [true] : []))}>
                {() => <SoundPage onBack={() => setPage('main')} />}
              </For>
            </box>
          ) as Gtk.Widget,
        );
        self.add_named(main, 'main');
        self.add_named(wifi, 'wifi');
        self.add_named(bluetooth, 'bluetooth');
        self.add_named(sound, 'sound');

        const update = () => self.set_visible_child_name(page());
        const unsubscribe = page.subscribe(update);
        self.connect('destroy', unsubscribe);
      }}
    />
  ) as Gtk.Stack;
}

export default function ControlCenter(gdkmonitor: Gdk.Monitor) {
  const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor;

  const [isRevealed, setIsRevealed] = createState(false);
  const [page, setPage] = createState<ControlCenterPage>('main');

  const windowName = `control-center-${gdkmonitor.get_connector()}`;

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let initializeContent = () => {};

  const hide_animated = () => {
    setIsRevealed(false);
    setPage('main');
    activeSidePanel.set('', '');
    const w = app.get_window(windowName);
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
    }
    hideTimeout = setTimeout(() => {
      if (w) w.set_visible(false);
      hideTimeout = null;
    }, shellMotion.panelDuration);
  };

  const show_animated = () => {
    initializeContent();
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    const w = app.get_window(windowName);
    if (w) w.set_visible(true);
    setIsRevealed(true);
  };

  const win = (
    <window
      name={windowName}
      class="ControlCenter"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={47}
      marginTop={0}
      keymode={Astal.Keymode.NONE}
      application={app}
      visible={false}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <box orientation={Gtk.Orientation.HORIZONTAL} vexpand={true}>
          {(() => {
            const rev = (
              <Lazy
                register={(initialize) => {
                  initializeContent = initialize;
                }}
                build={() =>
                  (
                    <revealer
                      transitionType={Gtk.RevealerTransitionType.CROSSFADE}
                      transitionDuration={shellMotion.panelDuration}
                      revealChild={isRevealed}
                    >
                      <box orientation={Gtk.Orientation.HORIZONTAL}>
                        <ControlCenterPages
                          isRevealed={isRevealed}
                          page={page}
                          setPage={setPage}
                          monitorConnector={gdkmonitor.get_connector() ?? ''}
                        />
                      </box>
                    </revealer>
                  ) as Gtk.Widget
                }
              />
            ) as Gtk.Widget;

            rev.set_hexpand(false);
            rev.set_hexpand_set(true);
            rev.set_vexpand(false);
            rev.set_vexpand_set(true);

            return rev;
          })()}

          <ClickCatcher onClick={hide_animated} hexpand={true} />
        </box>
      </box>
    </window>
  ) as Astal.Window;

  Object.assign(win, { hide_animated, show_animated });

  const keyCtrl = new Gtk.EventControllerKey();
  keyCtrl.connect('key-pressed', (_, keyval) => {
    if (keyval === Gdk.KEY_Escape) {
      hide_animated();
      return true;
    }
    return false;
  });
  win.add_controller(keyCtrl);

  return win;
}
