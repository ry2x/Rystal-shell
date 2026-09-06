import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';

export interface DetailMenuButtonProps {
  onDisconnect: () => void;
  onForget: () => void;
  forgetLabel?: string;
  triggerClass?: string;
}

export default function DetailMenuButton({
  onDisconnect,
  onForget,
  forgetLabel = 'Forget device',
  triggerClass,
}: DetailMenuButtonProps) {
  let popover: Gtk.Popover | null = null;

  return (
    <menubutton
      class={triggerClass ? `icon-btn ${triggerClass}` : 'icon-btn'}
      direction={Gtk.ArrowType.RIGHT}
      hasFrame={false}
      tooltipText="Connection options"
    >
      <LucideIcon name="settings" pixelSize={16} />
      <popover $={self => (popover = self)} hasArrow={false} cssClasses={['cc-detail-menu']}>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={scaleUiSize(4)}>
          <button
            class="cc-menu-btn"
            onClicked={() => {
              popover?.popdown();
              onDisconnect();
            }}
          >
            <box spacing={scaleUiSize(8)}>
              <LucideIcon name="unlink" pixelSize={16} />
              <label label="Disconnect" />
            </box>
          </button>
          <button
            class="cc-menu-btn cc-menu-danger"
            onClicked={() => {
              popover?.popdown();
              onForget();
            }}
          >
            <box spacing={scaleUiSize(8)}>
              <LucideIcon name="trash-2" pixelSize={16} />
              <label label={forgetLabel} />
            </box>
          </button>
        </box>
      </popover>
    </menubutton>
  );
}
