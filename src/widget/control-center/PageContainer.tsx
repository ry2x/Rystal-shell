import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {BAR_DESIGN_WIDTH, type BarBackgroundGeometry} from '@/stores/shell/barBackground';

export interface PageContainerProps {
  revealed: Accessor<boolean>;
  geometry: Accessor<BarBackgroundGeometry>;
  child: Gtk.Widget;
  uiScale: UiScaleContext;
}

function getContainerCss(dx: number, uiScale: UiScaleContext) {
  const panelWidth = uiScale.size(490);
  const barWidth = uiScale.size(BAR_DESIGN_WIDTH);
  const marginLeft = Math.max(-panelWidth, dx - barWidth - panelWidth);
  const opacity = Math.max(0, Math.min(1, (dx - barWidth) / panelWidth));
  return `transform: translateX(${marginLeft}px); opacity: ${opacity};`;
}

export default function PageContainer({revealed, geometry, child, uiScale}: PageContainerProps) {
  child.set_hexpand(true);
  child.set_halign(Gtk.Align.FILL);

  return (
    <box
      cssClasses={revealed.as(value => (value ? ['cc-container', 'revealed'] : ['cc-container']))}
      css={geometry.as(({dx}) => getContainerCss(dx, uiScale))}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={uiScale.size(16)}
      hexpand
      vexpand
      valign={Gtk.Align.FILL}
      halign={Gtk.Align.FILL}
    >
      {child}
    </box>
  );
}
