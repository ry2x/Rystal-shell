import {type Accessor, createState, onCleanup} from 'ags';
import {type Timer, timeout} from 'ags/time';

import {shellMotion} from '@/lib/motion';
import {deactivateSidePanel} from '@/stores/shell/windowManager';

export type ControlCenterPage = 'main' | 'wifi' | 'bluetooth' | 'sound';
export type ControlCenterDetailPage = Exclude<ControlCenterPage, 'main'>;

export interface ControlCenterState {
  visible: Accessor<boolean>;
  revealed: Accessor<boolean>;
  contentLoaded: Accessor<boolean>;
  page: Accessor<ControlCenterPage>;
  wifiLoaded: Accessor<boolean>;
  bluetoothLoaded: Accessor<boolean>;
  soundLoaded: Accessor<boolean>;
  showAnimated: () => void;
  hideAnimated: () => void;
  hideImmediately: () => void;
  openPage: (page: ControlCenterDetailPage) => void;
  showMainPage: () => void;
}

export function createControlCenterState(monitorConnector: string): ControlCenterState {
  const [visible, setVisible] = createState(false);
  const [revealed, setRevealed] = createState(false);
  const [contentLoaded, setContentLoaded] = createState(false);
  const [page, setPage] = createState<ControlCenterPage>('main');
  const [wifiLoaded, setWifiLoaded] = createState(false);
  const [bluetoothLoaded, setBluetoothLoaded] = createState(false);
  const [soundLoaded, setSoundLoaded] = createState(false);
  let hideTimer: Timer | null = null;

  const cancelHideTimer = () => {
    hideTimer?.cancel();
    hideTimer = null;
  };

  const showMainPage = () => setPage('main');

  const openPage = (target: ControlCenterDetailPage) => {
    if (target === 'wifi') setWifiLoaded(true);
    else if (target === 'bluetooth') setBluetoothLoaded(true);
    else setSoundLoaded(true);
    setPage(target);
  };

  const hideAnimated = () => {
    setRevealed(false);
    showMainPage();
    deactivateSidePanel('control-center', monitorConnector);

    cancelHideTimer();
    hideTimer = timeout(shellMotion.panelDuration, () => {
      hideTimer = null;
      setVisible(false);
    });
  };

  const hideImmediately = () => {
    cancelHideTimer();
    setRevealed(false);
    showMainPage();
    setVisible(false);
    deactivateSidePanel('control-center', monitorConnector);
  };

  const showAnimated = () => {
    cancelHideTimer();
    setContentLoaded(true);
    setVisible(true);
    setRevealed(true);
  };

  onCleanup(() => {
    cancelHideTimer();
    deactivateSidePanel('control-center', monitorConnector);
  });

  return {
    visible,
    revealed,
    contentLoaded,
    page,
    wifiLoaded,
    bluetoothLoaded,
    soundLoaded,
    showAnimated,
    hideAnimated,
    hideImmediately,
    openPage,
    showMainPage,
  };
}
