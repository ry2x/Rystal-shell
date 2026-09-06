import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {shellGeometry} from '@/lib/shellGeometry';
import {scaleUiSize} from '@/lib/uiScale';
import {type BarBackgroundGeometry} from '@/stores/shell/barBackground';

export interface PageContainerProps {
  name: string;
  revealed: Accessor<boolean>;
  geometry: Accessor<BarBackgroundGeometry>;
  children: JSX.Element;
}

function getContainerCss(dx: number) {
  const panelWidth = shellGeometry.controlCenterWidth;
  const marginLeft = Math.max(-panelWidth, dx - shellGeometry.barWidth - panelWidth);
  const opacity = Math.max(0, Math.min(1, (dx - shellGeometry.barWidth) / panelWidth));
  return `transform: translateX(${marginLeft}px); opacity: ${opacity};`;
}

export default function PageContainer({name, revealed, geometry, children}: PageContainerProps) {
  return (
    <box
      name={name}
      cssClasses={revealed.as(value => (value ? ['cc-container', 'revealed'] : ['cc-container']))}
      css={geometry.as(({dx}) => getContainerCss(dx))}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={scaleUiSize(16)}
      hexpand
      vexpand
      valign={Gtk.Align.FILL}
      halign={Gtk.Align.FILL}
    >
      {children}
    </box>
  );
}
