import { Gtk } from 'ags/gtk4';

import BluetoothToggle from './BluetoothToggle';
import CaffeineToggle from './CaffeineToggle';
import PowerProfileToggle from './PowerProfileToggle';
import WifiToggle from './WifiToggle';

export interface QuickTogglesProps {
  onOpenWifi: () => void;
  onOpenBluetooth: () => void;
}

export default function QuickToggles({ onOpenWifi, onOpenBluetooth }: QuickTogglesProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={16}>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={16} homogeneous>
        <WifiToggle onOpen={onOpenWifi} />
        <BluetoothToggle onOpen={onOpenBluetooth} />
      </box>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={16} homogeneous>
        <PowerProfileToggle />
        <CaffeineToggle />
      </box>
    </box>
  );
}
