import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import CoverFlowController from '@/widget/wallpaper-selector/widget/CoverFlow';

const VIEWPORT_HEIGHT = scaleUiSize(420);

export interface CoverFlowViewHandle {
  activateSelection: () => void;
  moveSelection: (delta: number) => void;
  setActive: (active: boolean) => void;
}

export interface CoverFlowViewProps {
  onApplied: () => void;
  register: (handle: CoverFlowViewHandle | null) => void;
  viewportWidth: number;
}

interface CoverFlowWidgets {
  fixed: Gtk.Fixed | null;
  positionLabel: Gtk.Label | null;
  root: Gtk.Box | null;
  statusLabel: Gtk.Label | null;
}

export default function CoverFlowView({onApplied, register, viewportWidth}: CoverFlowViewProps) {
  const widgets: CoverFlowWidgets = {
    fixed: null,
    positionLabel: null,
    root: null,
    statusLabel: null,
  };
  let controller: CoverFlowController | null = null;

  const registerController = () => {
    const {fixed, positionLabel, root, statusLabel} = widgets;
    if (controller || !fixed || !positionLabel || !root || !statusLabel) return;

    controller = new CoverFlowController({
      fixed,
      onApplied,
      positionLabel,
      statusLabel,
      viewportWidth,
      widget: root,
    });
    register(controller);
  };

  onCleanup(() => {
    register(null);
    controller?.dispose();
    controller = null;
  });

  return (
    <box
      $={self => {
        widgets.root = self;
        registerController();
      }}
      class="wallpaper-selector-content"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={scaleUiSize(8)}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <overlay
        cssClasses={['wallpaper-coverflow']}
        widthRequest={viewportWidth}
        heightRequest={VIEWPORT_HEIGHT}
        hexpand={false}
        vexpand={false}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        overflow={Gtk.Overflow.VISIBLE}
      >
        <box widthRequest={viewportWidth} heightRequest={VIEWPORT_HEIGHT} />
        <scrolledwindow
          $type="overlay"
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.NEVER}
          propagateNaturalWidth={false}
          propagateNaturalHeight={false}
          widthRequest={viewportWidth}
          heightRequest={VIEWPORT_HEIGHT}
          halign={Gtk.Align.FILL}
          valign={Gtk.Align.FILL}
        >
          <Gtk.Fixed
            $={self => {
              widgets.fixed = self;
              registerController();
            }}
            widthRequest={viewportWidth}
            heightRequest={VIEWPORT_HEIGHT}
            overflow={Gtk.Overflow.VISIBLE}
          />
        </scrolledwindow>
        <label
          $type="overlay"
          $={self => {
            widgets.positionLabel = self;
            registerController();
          }}
          class="wallpaper-path"
          canTarget={false}
          hexpand={false}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.END}
          marginBottom={scaleUiSize(48)}
          xalign={0.5}
        />
      </overlay>
      <label
        $={self => {
          widgets.statusLabel = self;
          registerController();
        }}
        class="wallpaper-status"
        xalign={0.5}
      />
    </box>
  );
}
