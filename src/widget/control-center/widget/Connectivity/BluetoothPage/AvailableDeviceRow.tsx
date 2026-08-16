import {createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Bluetooth from 'gi://AstalBluetooth';
import Pango from 'gi://Pango';

import {getBluetoothDeviceDetail} from './utils';

export interface AvailableDeviceRowProps {
  device: Bluetooth.Device;
  onConnect: () => void;
}

export default function AvailableDeviceRow({device, onConnect}: AvailableDeviceRowProps) {
  return (
    <button class="cc-connectivity-row" onClicked={onConnect}>
      <box spacing={14}>
        <image class="cc-bt-device-icon" iconName={createBinding(device, 'icon')} pixelSize={24} />
        <box orientation={Gtk.Orientation.VERTICAL} hexpand>
          <label
            label={createBinding(device, 'alias')}
            class="cc-bt-device-name"
            halign={Gtk.Align.START}
            ellipsize={Pango.EllipsizeMode.END}
          />
          <label
            label={createBinding(device, 'battery_percentage').as(value =>
              getBluetoothDeviceDetail(value, 'Paired device')
            )}
            class="cc-row-subtitle cc-bt-device-detail"
            halign={Gtk.Align.START}
          />
        </box>
      </box>
    </button>
  );
}
