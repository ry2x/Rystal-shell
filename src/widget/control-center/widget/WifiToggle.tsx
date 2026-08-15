import { createBinding } from 'ags';
import { Gtk } from 'ags/gtk4';

import Network from 'gi://AstalNetwork';
import Pango from 'gi://Pango';

import { toggleWifi } from '../../../stores/network';
import { LucideIcon } from '../../../widget/common/lucide';

export interface WifiToggleProps {
  onOpen: () => void;
}

export default function WifiToggle({ onOpen }: WifiToggleProps) {
  const wifi = Network.get_default().wifi;
  if (!wifi) return <box visible={false} />;

  const enabled = createBinding(wifi, 'enabled');

  return (
    <box
      class={enabled.as((value) => `cc-toggle-btn ${value ? 'active' : ''}`)}
      spacing={0}
      css="padding: 0;"
    >
      <button
        hexpand
        class="cc-split-btn-left"
        css="padding: 16px;"
        onClicked={() => toggleWifi(wifi.enabled)}
        tooltipText="Toggle Wi-Fi"
      >
        <box spacing={12}>
          <LucideIcon name="wifi" class="icon" pixelSize={24} />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label
              label="Wi-Fi"
              css="font-weight: 700; font-size: 1.1em;"
              halign={Gtk.Align.START}
            />
            <label
              label={createBinding(wifi, 'ssid').as((ssid) => ssid || 'Disconnected')}
              css="font-size: 0.8em; opacity: 0.7;"
              halign={Gtk.Align.START}
              ellipsize={Pango.EllipsizeMode.END}
              maxWidthChars={12}
              lines={1}
            />
          </box>
        </box>
      </button>
      <button
        class="cc-split-btn-right"
        css="padding: 16px;"
        onClicked={onOpen}
        tooltipText="Manage Wi-Fi"
      >
        <LucideIcon name="chevron-right" pixelSize={20} />
      </button>
    </box>
  );
}
