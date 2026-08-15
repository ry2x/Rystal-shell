import { createBinding } from 'ags';
import { Gtk } from 'ags/gtk4';

import Bluetooth from 'gi://AstalBluetooth';
import Pango from 'gi://Pango';

import { DetailMenuButton } from '../Shared';
import { getBluetoothDeviceDetail } from './utils';

export interface ConnectedDeviceRowProps {
  device: Bluetooth.Device;
  onDisconnect: () => void;
  onForget: () => void;
}

export default function ConnectedDeviceRow({
  device,
  onDisconnect,
  onForget,
}: ConnectedDeviceRowProps) {
  return (
    <box class="cc-connectivity-row active" spacing={14}>
      <image class="cc-bt-device-icon" iconName={createBinding(device, 'icon')} pixelSize={24} />
      <box orientation={Gtk.Orientation.VERTICAL} hexpand>
        <label
          label={createBinding(device, 'alias')}
          class="cc-bt-device-name"
          halign={Gtk.Align.START}
          ellipsize={Pango.EllipsizeMode.END}
        />
        <label
          label={createBinding(device, 'battery_percentage').as((value) =>
            getBluetoothDeviceDetail(value, 'Connected'),
          )}
          class="cc-row-subtitle cc-bt-device-detail"
          halign={Gtk.Align.START}
        />
      </box>
      <DetailMenuButton
        triggerClass="cc-bt-settings-button"
        onDisconnect={onDisconnect}
        onForget={onForget}
      />
    </box>
  );
}
