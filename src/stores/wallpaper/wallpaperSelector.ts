import {type Accessor, createState, onCleanup} from 'ags';
import {type Timer, interval, timeout} from 'ags/time';

import {deactivateSidePanel} from '@/stores/shell/windowManager';
import {
  cancelWallpaperWork,
  clearWallpaperError,
  refreshWallpapers,
} from '@/stores/wallpaper/wallpaper';

const PANEL_HEIGHT = 390;
const HIDE_DELAY_MS = 420;
const ANIMATION_INTERVAL_MS = 1000 / 60;
const ANIMATION_SPEED = 0.22;

export interface WallpaperSelectorStateOptions {
  monitorConnector: string | null;
  setCoverFlowActive: (active: boolean) => void;
}

export interface WallpaperSelectorState {
  visible: Accessor<boolean>;
  revealed: Accessor<boolean>;
  panelHeight: Accessor<number>;
  showAnimated: () => void;
  hideAnimated: () => void;
}

export function createWallpaperSelectorState({
  monitorConnector,
  setCoverFlowActive,
}: WallpaperSelectorStateOptions): WallpaperSelectorState {
  const [visible, setVisible] = createState(false);
  const [revealed, setRevealed] = createState(false);
  const [panelHeight, setPanelHeight] = createState(0);
  let currentPanelHeight = 0;
  let targetPanelHeight = 0;
  let animationTimer: Timer | null = null;
  let hideTimer: Timer | null = null;

  function cancelHideTimer() {
    hideTimer?.cancel();
    hideTimer = null;
  }

  function animatePanelTo(height: number) {
    targetPanelHeight = height;
    if (animationTimer) return;

    animationTimer = interval(ANIMATION_INTERVAL_MS, () => {
      const difference = targetPanelHeight - currentPanelHeight;
      if (Math.abs(difference) < 1) {
        currentPanelHeight = targetPanelHeight;
        setPanelHeight(currentPanelHeight);
        animationTimer?.cancel();
        animationTimer = null;
        return;
      }

      currentPanelHeight += difference * ANIMATION_SPEED;
      setPanelHeight(currentPanelHeight);
    });
  }

  function hideAnimated() {
    setRevealed(false);
    animatePanelTo(0);

    deactivateSidePanel('wallpaper-selector', monitorConnector);

    cancelHideTimer();
    hideTimer = timeout(HIDE_DELAY_MS, () => {
      hideTimer = null;
      setCoverFlowActive(false);
      cancelWallpaperWork();
      setVisible(false);
    });
  }

  function showAnimated() {
    cancelHideTimer();
    clearWallpaperError();
    setVisible(true);
    setCoverFlowActive(true);
    setRevealed(true);
    animatePanelTo(PANEL_HEIGHT);
    void refreshWallpapers();
  }

  onCleanup(() => {
    cancelHideTimer();
    animationTimer?.cancel();
    animationTimer = null;
    setCoverFlowActive(false);
    cancelWallpaperWork();
    deactivateSidePanel('wallpaper-selector', monitorConnector);
  });

  return {visible, revealed, panelHeight, showAnimated, hideAnimated};
}
