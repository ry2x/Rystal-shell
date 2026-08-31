import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {type UiScaleContext} from '@/lib/uiScale';
import {BAR_DESIGN_WIDTH} from '@/stores/shell/barBackground';
import {createWallpaperSelectorState} from '@/stores/wallpaper/wallpaperSelector';
import ClickCatcher from '@/widget/common/ClickCatcher';
import CoverFlowController from '@/widget/wallpaper-selector/widget/CoverFlow';

export interface WallpaperSelectorProps {
  monitor: Gdk.Monitor;
  uiScale: UiScaleContext;
}

type WallpaperSelectorWindow = Astal.Window & {
  hide_animated: () => void;
  show_animated: () => void;
};

export default function WallpaperSelector({monitor, uiScale}: WallpaperSelectorProps) {
  const {TOP, BOTTOM, LEFT, RIGHT} = Astal.WindowAnchor;
  const monitorWidth = monitor.get_geometry().width;
  const viewportWidth = Math.max(
    uiScale.size(900),
    monitorWidth - uiScale.size(BAR_DESIGN_WIDTH) - uiScale.size(56)
  );
  let coverFlow: CoverFlowController | null = null;

  const state = createWallpaperSelectorState({
    monitorConnector: monitor.get_connector(),
    setCoverFlowActive: active => coverFlow?.setActive(active),
    uiScale,
  });
  coverFlow = new CoverFlowController({
    onApplied: state.hideAnimated,
    viewportWidth,
    uiScale,
  });

  const window = (
    <window
      name={`wallpaper-selector-${monitor.get_connector()}`}
      class={`WallpaperSelector ${uiScale.cssClass}`}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.EXCLUSIVE}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      marginLeft={uiScale.size(BAR_DESIGN_WIDTH)}
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
            const panelHeight = uiScale.size(390);
            const progress = Math.max(0, Math.min(1, height / panelHeight));
            return `transform: translateY(${panelHeight - height}px); opacity: ${progress};`;
          })}
          heightRequest={uiScale.size(390)}
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
