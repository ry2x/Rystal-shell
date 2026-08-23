import {createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Network from 'gi://AstalNetwork';
import Pango from 'gi://Pango';

import {toggleWifi} from '@/stores/connectivity/network';
import {LucideIcon} from '@/widget/common/lucide';

export interface WifiToggleProps {
  onOpen: () => void;
}

export default function WifiToggle({onOpen}: WifiToggleProps) {
  const wifi = Network.get_default().wifi;
  if (!wifi) return <box visible={false} />;

  const enabled = createBinding(wifi, 'enabled');

  return (
    <box
      class={enabled.as(value => `cc-toggle-btn cc-single-toggle ${value ? 'active' : ''}`)}
      spacing={0}
    >
      <button
        hexpand
        class="cc-toggle-button"
        onClicked={() => toggleWifi(wifi.enabled)}
        tooltipText="Click to toggle Wi-Fi · Hold to manage"
      >
        <Gtk.GestureLongPress
          propagationPhase={Gtk.PropagationPhase.CAPTURE}
          onPressed={gesture => {
            gesture.set_state(Gtk.EventSequenceState.CLAIMED);
            onOpen();
          }}
        />
        <box spacing={12}>
          <LucideIcon name="wifi" class="icon" pixelSize={24} />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label label="Wi-Fi" class="cc-toggle-title" halign={Gtk.Align.START} />
            <label
              label={createBinding(wifi, 'ssid').as(ssid => ssid || 'Disconnected')}
              class="cc-toggle-status"
              halign={Gtk.Align.START}
              ellipsize={Pango.EllipsizeMode.END}
              maxWidthChars={12}
              lines={1}
            />
          </box>
        </box>
      </button>
    </box>
  );
}
