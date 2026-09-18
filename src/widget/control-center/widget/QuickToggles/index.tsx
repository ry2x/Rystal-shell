import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import BluetoothToggle from '@/widget/control-center/widget/QuickToggles/BluetoothToggle';
import CaffeineToggle from '@/widget/control-center/widget/QuickToggles/CaffeineToggle';
import PowerProfileToggle from '@/widget/control-center/widget/QuickToggles/PowerProfileToggle';
import WifiToggle from '@/widget/control-center/widget/QuickToggles/WifiToggle';

export interface QuickTogglesProps {
  onOpenWifi: () => void;
  onOpenBluetooth: () => void;
}

export default function QuickToggles({onOpenWifi, onOpenBluetooth}: QuickTogglesProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={scaleUiSize(16)}>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={scaleUiSize(16)} homogeneous>
        <WifiToggle onOpen={onOpenWifi} />
        <BluetoothToggle onOpen={onOpenBluetooth} />
      </box>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={scaleUiSize(16)} homogeneous>
        <PowerProfileToggle />
        <CaffeineToggle />
      </box>
    </box>
  );
}
