import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {LucideIcon} from '@/widget/common/lucide';

export interface EmptyStateProps {
  label: string;
  icon: string;
  visible?: boolean | Accessor<boolean>;
  className?: string;
}

export default function EmptyState({label, icon, visible = true, className}: EmptyStateProps) {
  const classes = className ? `empty-state ${className}` : 'empty-state';

  return (
    <box
      class={classes}
      visible={visible}
      spacing={8}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
    >
      <LucideIcon name={icon} pixelSize={20} class="empty-state-icon" />
      <label label={label} class="empty-state-label" />
    </box>
  );
}
