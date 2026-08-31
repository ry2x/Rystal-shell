import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';

export interface EmptyStateProps {
  label: string;
  icon: string;
  visible?: boolean | Accessor<boolean>;
  className?: string;
  uiScale: UiScaleContext;
}

export default function EmptyState({
  label,
  icon,
  visible = true,
  className,
  uiScale,
}: EmptyStateProps) {
  const classes = className ? `empty-state ${className}` : 'empty-state';

  return (
    <box
      class={classes}
      visible={visible}
      spacing={uiScale.size(8)}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
    >
      <LucideIcon name={icon} pixelSize={20} class="empty-state-icon" uiScale={uiScale} />
      <label label={label} class="empty-state-label" />
    </box>
  );
}
