import { createBinding } from 'ags';
import { Gtk } from 'ags/gtk4';

import Bluetooth from 'gi://AstalBluetooth';

import { toggleBluetooth } from '../../../stores/network';
import { LucideIcon } from '../../../widget/common/lucide';

export interface BluetoothToggleProps {
  onOpen: () => void;
}

export default function BluetoothToggle({ onOpen }: BluetoothToggleProps) {
  const bluetooth = Bluetooth.get_default();
  const powered = createBinding(bluetooth, 'is_powered');

  return (
    <box
      class={powered.as((value) => `cc-toggle-btn ${value ? 'active' : ''}`)}
      spacing={0}
      css="padding: 0;"
    >
      <button
        hexpand
        class="cc-split-btn-left"
        css="padding: 16px;"
        onClicked={() => toggleBluetooth(bluetooth.is_powered)}
        tooltipText="Toggle Bluetooth"
      >
        <box spacing={12}>
          <LucideIcon name="bluetooth" class="icon" pixelSize={24} />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label
              label="Bluetooth"
              css="font-weight: 700; font-size: 1.1em;"
              halign={Gtk.Align.START}
            />
            <label
              label={createBinding(bluetooth, 'is_connected').as((connected) =>
                connected ? 'Connected' : 'Disconnected',
              )}
              css="font-size: 0.8em; opacity: 0.7;"
              halign={Gtk.Align.START}
            />
          </box>
        </box>
      </button>
      <button
        class="cc-split-btn-right"
        css="padding: 16px;"
        onClicked={onOpen}
        tooltipText="Manage Bluetooth"
      >
        <LucideIcon name="chevron-right" pixelSize={20} />
      </button>
    </box>
  );
}
