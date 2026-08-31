import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';

export interface DetailMenuButtonProps {
  onDisconnect: () => void;
  onForget: () => void;
  forgetLabel?: string;
  triggerClass?: string;
  uiScale: UiScaleContext;
}

export default function DetailMenuButton({
  onDisconnect,
  onForget,
  forgetLabel = 'Forget device',
  triggerClass,
  uiScale,
}: DetailMenuButtonProps) {
  const button = (
    <button
      class={triggerClass ? `icon-btn ${triggerClass}` : 'icon-btn'}
      tooltipText="Connection options"
    >
      <LucideIcon name="settings" pixelSize={16} uiScale={uiScale} />
    </button>
  ) as Gtk.Button;

  const popover = new Gtk.Popover({
    hasArrow: false,
    cssClasses: ['cc-detail-menu'],
  });

  popover.set_parent(button);
  popover.set_child(
    (
      <box orientation={Gtk.Orientation.VERTICAL} spacing={uiScale.size(4)}>
        <button
          class="cc-menu-btn"
          onClicked={() => {
            popover.popdown();
            onDisconnect();
          }}
        >
          <box spacing={uiScale.size(8)}>
            <LucideIcon name="unlink" pixelSize={16} uiScale={uiScale} />
            <label label="Disconnect" />
          </box>
        </button>
        <button
          class="cc-menu-btn cc-menu-danger"
          onClicked={() => {
            popover.popdown();
            onForget();
          }}
        >
          <box spacing={uiScale.size(8)}>
            <LucideIcon name="trash-2" pixelSize={16} uiScale={uiScale} />
            <label label={forgetLabel} />
          </box>
        </button>
      </box>
    ) as Gtk.Widget
  );

  button.connect('clicked', () => popover.popup());
  button.connect('destroy', () => {
    popover.popdown();
    if (popover.get_parent()) popover.unparent();
  });

  return button;
}
