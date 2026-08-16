import {type Accessor, createState, onCleanup} from 'ags';
import {type Timer, timeout} from 'ags/time';

import {shellMotion} from '../../lib/motion';
import {deactivateSidePanel} from '../shell/windowManager';

export interface DateWeatherPopupState {
  visible: Accessor<boolean>;
  revealed: Accessor<boolean>;
  loaded: Accessor<boolean>;
  showAnimated: () => void;
  hideAnimated: () => void;
}

export function createDateWeatherPopupState(
  monitorConnector: string | null
): DateWeatherPopupState {
  const [visible, setVisible] = createState(false);
  const [revealed, setRevealed] = createState(false);
  const [loaded, setLoaded] = createState(false);
  let hideTimer: Timer | null = null;

  const cancelHideTimer = () => {
    hideTimer?.cancel();
    hideTimer = null;
  };

  const hideAnimated = () => {
    setRevealed(false);
    deactivateSidePanel('date-weather', monitorConnector);

    cancelHideTimer();
    hideTimer = timeout(shellMotion.panelDuration, () => {
      hideTimer = null;
      setVisible(false);
    });
  };

  const showAnimated = () => {
    cancelHideTimer();
    setLoaded(true);
    setVisible(true);
    setRevealed(true);
  };

  onCleanup(() => {
    cancelHideTimer();
    deactivateSidePanel('date-weather', monitorConnector);
  });

  return {visible, revealed, loaded, showAnimated, hideAnimated};
}
