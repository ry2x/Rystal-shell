import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';

export interface PageHeaderProps {
  title: string;
  enabled: Accessor<boolean>;
  onToggle: () => void;
  onBack: () => void;
  className?: string;
  uiScale: UiScaleContext;
}

export default function PageHeader({
  title,
  enabled,
  onToggle,
  onBack,
  className,
  uiScale,
}: PageHeaderProps) {
  return (
    <box
      class={className ? `cc-connectivity-header ${className}` : 'cc-connectivity-header'}
      spacing={uiScale.size(12)}
    >
      <button class="icon-btn" onClicked={onBack} tooltipText="Back">
        <LucideIcon name="chevron-left" pixelSize={22} uiScale={uiScale} />
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
