import {Gdk, Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {toggleControlCenter} from '@/stores/shell/windowManager';
import {openUpdateManager, updatesPoll} from '@/stores/system/update';
import {LucideIcon} from '@/widget/common/lucide';

export interface UpdatesProps {
  monitor: Gdk.Monitor;
  uiScale: UiScaleContext;
}

export default function Updates({monitor, uiScale}: UpdatesProps) {
  const isVisible = updatesPoll.as(u => parseInt(u) > 0);

  const toggleMenu = () => {
    toggleControlCenter(monitor.get_connector());
  };

  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      transitionDuration={250}
      revealChild={isVisible}
      visible={isVisible}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <button class="Updates" onClicked={toggleMenu}>
          <Gtk.GestureClick
            button={3}
            propagationPhase={Gtk.PropagationPhase.CAPTURE}
            onPressed={gesture => {
              gesture.set_state(Gtk.EventSequenceState.CLAIMED);
              openUpdateManager();
            }}
          />
          <box spacing={uiScale.size(4)} orientation={Gtk.Orientation.VERTICAL}>
            <LucideIcon name="package" class="icon" />
            <label label={updatesPoll} />
          </box>
        </button>
      </box>
    </revealer>
  );
}
