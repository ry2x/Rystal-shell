import { createState } from 'ags';
import { Astal, Gdk, Gtk } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import GLib from 'gi://GLib';

import {
  cancelWallpaperWork,
  clearWallpaperError,
  refreshWallpapers,
} from '../../stores/wallpaper';
import { activeSidePanel } from '../../stores/windowManager';
import { createCoverFlow } from './widget/CoverFlow';

const PANEL_HEIGHT = 390;
const HIDE_DELAY_MS = 420;
const BAR_WIDTH = 47;
const CONTENT_HORIZONTAL_PADDING = 56;

function ClickCatcher({ onClick }: { onClick: () => void }) {
  const box = (<box class="click-catcher" hexpand vexpand />) as Gtk.Box;
  const gesture = new Gtk.GestureClick();
  gesture.connect('pressed', onClick);
  box.add_controller(gesture);
  return box;
}

export default function WallpaperSelector(gdkmonitor: Gdk.Monitor) {
  const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor;
  const [isRevealed, setIsRevealed] = createState(false);
  const [localPanelHeight, setLocalPanelHeight] = createState(0);
  const monitorConnector = gdkmonitor.get_connector();
  const windowName = `wallpaper-selector-${monitorConnector}`;

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let panelAnimationId = 0;
  let currentPanelHeight = 0;
  let targetPanelHeight = 0;
  let hideAnimated = () => {};
  const monitorWidth = gdkmonitor.get_geometry().width;
  const viewportWidth = Math.max(900, monitorWidth - BAR_WIDTH - CONTENT_HORIZONTAL_PADDING);
  const coverFlow = createCoverFlow(() => hideAnimated(), viewportWidth);

  const animatePanelTo = (height: number) => {
    targetPanelHeight = height;
    if (panelAnimationId !== 0) return;

    panelAnimationId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000 / 60, () => {
      const diff = targetPanelHeight - currentPanelHeight;
      if (Math.abs(diff) < 1) {
        currentPanelHeight = targetPanelHeight;
        setLocalPanelHeight(currentPanelHeight);
        panelAnimationId = 0;
        return GLib.SOURCE_REMOVE;
      }

      currentPanelHeight += diff * 0.22;
      setLocalPanelHeight(currentPanelHeight);
      return GLib.SOURCE_CONTINUE;
    });
  };

  const win = (
    <window
      name={windowName}
      class="WallpaperSelector"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.EXCLUSIVE}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={BAR_WIDTH}
      application={app}
      visible={false}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <ClickCatcher onClick={() => hideAnimated()} />
        <box
          cssClasses={isRevealed.as((revealed) =>
            revealed ? ['wallpaper-selector-panel', 'revealed'] : ['wallpaper-selector-panel'],
          )}
          css={localPanelHeight((height) => {
            const progress = Math.max(0, Math.min(1, height / PANEL_HEIGHT));
            return `transform: translateY(${PANEL_HEIGHT - height}px); opacity: ${progress};`;
          })}
          heightRequest={PANEL_HEIGHT}
          vexpand={false}
          vexpandSet={true}
          valign={Gtk.Align.END}
          overflow={Gtk.Overflow.HIDDEN}
        >
          {coverFlow.widget}
        </box>
      </box>
    </window>
  ) as Astal.Window;

  hideAnimated = () => {
    setIsRevealed(false);
    animatePanelTo(0);
    if (
      activeSidePanel.get().panel === 'wallpaper-selector' &&
      activeSidePanel.get().monitor === monitorConnector
    ) {
      activeSidePanel.set('', '');
    }
    if (hideTimeout !== null) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      coverFlow.setActive(false);
      cancelWallpaperWork();
      win.set_visible(false);
      hideTimeout = null;
    }, HIDE_DELAY_MS);
  };

  const showAnimated = () => {
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    clearWallpaperError();
    win.set_visible(true);
    coverFlow.setActive(true);
    setIsRevealed(true);
    animatePanelTo(PANEL_HEIGHT);
    void refreshWallpapers();
  };

  Object.assign(win, { hide_animated: hideAnimated, show_animated: showAnimated });

  const keyController = new Gtk.EventControllerKey();
  keyController.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
  keyController.connect('key-pressed', (_controller, keyval) => {
    if (keyval === Gdk.KEY_Escape) {
      hideAnimated();
      return true;
    }
    if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Up) {
      coverFlow.moveSelection(-1);
      return true;
    }
    if (keyval === Gdk.KEY_Right || keyval === Gdk.KEY_Down) {
      coverFlow.moveSelection(1);
      return true;
    }
    if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
      void coverFlow.activateSelection();
      return true;
    }
    return false;
  });
  win.add_controller(keyController);

  win.connect('destroy', () => {
    if (hideTimeout !== null) clearTimeout(hideTimeout);
    if (panelAnimationId !== 0) GLib.source_remove(panelAnimationId);
    coverFlow.setActive(false);
    cancelWallpaperWork();
  });

  return win;
}
