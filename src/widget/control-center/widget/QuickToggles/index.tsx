import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import BluetoothToggle from '@/widget/control-center/widget/QuickToggles/BluetoothToggle';
import CaffeineToggle from '@/widget/control-center/widget/QuickToggles/CaffeineToggle';
import PowerProfileToggle from '@/widget/control-center/widget/QuickToggles/PowerProfileToggle';
import WifiToggle from '@/widget/control-center/widget/QuickToggles/WifiToggle';

export interface QuickTogglesProps {
  onOpenWifi: () => void;
  onOpenBluetooth: () => void;
  uiScale: UiScaleContext;
}

export default function QuickToggles({onOpenWifi, onOpenBluetooth, uiScale}: QuickTogglesProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={uiScale.size(16)}>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={uiScale.size(16)} homogeneous>
        <WifiToggle onOpen={onOpenWifi} uiScale={uiScale} />
        <BluetoothToggle onOpen={onOpenBluetooth} uiScale={uiScale} />
      </box>
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={uiScale.size(16)} homogeneous>
        <PowerProfileToggle uiScale={uiScale} />
        <CaffeineToggle uiScale={uiScale} />
      </box>
    </box>
  );
}
