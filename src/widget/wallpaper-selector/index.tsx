import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {shellGeometry} from '@/lib/shellGeometry';
import {scaleUiSize} from '@/lib/uiScale';
import {createWallpaperSelectorState} from '@/stores/wallpaper/wallpaperSelector';
import ClickCatcher from '@/widget/common/ClickCatcher';
import CoverFlowController from '@/widget/wallpaper-selector/widget/CoverFlow';

const CONTENT_HORIZONTAL_PADDING = scaleUiSize(56);

export interface WallpaperSelectorProps {
  monitor: Gdk.Monitor;
}

type WallpaperSelectorWindow = Astal.Window & {
  hide_animated: () => void;
  show_animated: () => void;
};

export default function WallpaperSelector({monitor}: WallpaperSelectorProps) {
  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;
  const monitorWidth = monitor.get_geometry().width;
  const viewportWidth = Math.max(
    scaleUiSize(900),
    monitorWidth - shellGeometry.barWidth - CONTENT_HORIZONTAL_PADDING
  );
  let coverFlow: CoverFlowController | null = null;

  const state = createWallpaperSelectorState({
    monitorConnector: monitor.get_connector(),
    setCoverFlowActive: active => coverFlow?.setActive(active),
  });
  coverFlow = new CoverFlowController({
    onApplied: state.hideAnimated,
    viewportWidth,
  });

  const window = (
    <window
      name={`wallpaper-selector-${monitor.get_connector()}`}
      class="WallpaperSelector"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.EXCLUSIVE}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={shellGeometry.barWidth}
      application={app}
      visible={state.visible}
    >
      <Gtk.EventControllerKey
        propagationPhase={Gtk.PropagationPhase.CAPTURE}
        onKeyPressed={(_controller, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            state.hideAnimated();
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
            coverFlow.activateSelection();
            return true;
          }
          return false;
        }}
      />
      <box orientation={Gtk.Orientation.VERTICAL}>
        <ClickCatcher onClick={state.hideAnimated} hexpand vexpand />
        <box
          cssClasses={state.revealed.as(revealed =>
            revealed ? ['wallpaper-selector-panel', 'revealed'] : ['wallpaper-selector-panel']
          )}
          css={state.panelHeight.as(height => {
            const progress = Math.max(0, Math.min(1, height / shellGeometry.wallpaperPanelHeight));
            return `transform: translateY(${shellGeometry.wallpaperPanelHeight - height}px); opacity: ${progress};`;
          })}
          heightRequest={shellGeometry.wallpaperPanelHeight}
          vexpand={false}
          vexpandSet
          valign={Gtk.Align.END}
          overflow={Gtk.Overflow.HIDDEN}
        >
          {coverFlow.widget}
        </box>
      </box>
    </window>
  ) as WallpaperSelectorWindow;

  window.hide_animated = state.hideAnimated;
  window.show_animated = state.showAnimated;
  return window;
}
