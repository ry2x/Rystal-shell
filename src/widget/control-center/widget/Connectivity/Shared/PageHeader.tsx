import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {LucideIcon} from '@/widget/common/lucide';

export interface PageHeaderProps {
  title: string;
  enabled: Accessor<boolean>;
  onToggle: () => void;
  onBack: () => void;
  className?: string;
}

export default function PageHeader({title, enabled, onToggle, onBack, className}: PageHeaderProps) {
  return (
    <box class={className} spacing={12}>
      <button class="icon-btn" onClicked={onBack} tooltipText="Back">
        <LucideIcon name="chevron-left" pixelSize={22} />
      </button>
      <label label={title} class="cc-title" hexpand halign={Gtk.Align.START} />
      <switch
        class="cc-connectivity-switch"
        valign={Gtk.Align.CENTER}
        $={(self: Gtk.Switch) => {
          let synchronizing = false;
          const sync = () => {
            synchronizing = true;
            self.set_active(enabled());
            synchronizing = false;
          };
          const unsubscribe = enabled.subscribe(sync);
          const hook = self.connect('notify::active', () => {
            if (!synchronizing) onToggle();
            return true;
          });
          sync();
          self.connect('destroy', () => {
            self.disconnect(hook);
            unsubscribe();
          });
        }}
      />
    </box>
  );
}
