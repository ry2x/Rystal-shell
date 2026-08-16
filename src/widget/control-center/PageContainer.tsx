import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type BarBackgroundGeometry} from '../../stores/shell/barBackground';

export interface PageContainerProps {
  revealed: Accessor<boolean>;
  geometry: Accessor<BarBackgroundGeometry>;
  child: Gtk.Widget;
}

function getContainerCss(dx: number) {
  const marginLeft = Math.max(-490, dx - 537);
  const opacity = Math.max(0, Math.min(1, (dx - 47) / 490));
  return `transform: translateX(${marginLeft}px); opacity: ${opacity};`;
}

export default function PageContainer({revealed, geometry, child}: PageContainerProps) {
  child.set_hexpand(true);
  child.set_halign(Gtk.Align.FILL);

  return (
    <box
      cssClasses={revealed.as(value => (value ? ['cc-container', 'revealed'] : ['cc-container']))}
      css={geometry.as(({dx}) => getContainerCss(dx))}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={16}
      hexpand
      vexpand
      valign={Gtk.Align.FILL}
      halign={Gtk.Align.FILL}
    >
      {child}
    </box>
  );
}
