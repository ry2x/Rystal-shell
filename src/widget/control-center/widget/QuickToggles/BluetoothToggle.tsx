import {createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Bluetooth from 'gi://AstalBluetooth';

import {type UiScaleContext} from '@/lib/uiScale';
import {toggleBluetooth} from '@/stores/connectivity/network';
import {LucideIcon} from '@/widget/common/lucide';

export interface BluetoothToggleProps {
  onOpen: () => void;
  uiScale: UiScaleContext;
}

export default function BluetoothToggle({onOpen, uiScale}: BluetoothToggleProps) {
  const bluetooth = Bluetooth.get_default();
  const powered = createBinding(bluetooth, 'is_powered');

  return (
    <box
      class={powered.as(value => `cc-toggle-btn cc-single-toggle ${value ? 'active' : ''}`)}
      spacing={0}
    >
      <button
        hexpand
        class="cc-toggle-button"
        onClicked={() => toggleBluetooth(bluetooth.is_powered)}
        tooltipText="Click to toggle Bluetooth · Hold to manage"
      >
        <Gtk.GestureLongPress
          propagationPhase={Gtk.PropagationPhase.CAPTURE}
          onPressed={gesture => {
            gesture.set_state(Gtk.EventSequenceState.CLAIMED);
            onOpen();
          }}
        />
        <box spacing={uiScale.size(12)}>
          <LucideIcon name="bluetooth" class="icon" pixelSize={24} uiScale={uiScale} />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label label="Bluetooth" class="cc-toggle-title" halign={Gtk.Align.START} />
            <label
              label={createBinding(bluetooth, 'is_connected').as(connected =>
                connected ? 'Connected' : 'Disconnected'
              )}
              class="cc-toggle-status"
              halign={Gtk.Align.START}
            />
          </box>
        </box>
      </button>
    </box>
  );
}
