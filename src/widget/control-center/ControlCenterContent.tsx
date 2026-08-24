import {Gtk} from 'ags/gtk4';

import {type ControlCenterDetailPage} from '@/stores/panel/controlCenter';
import {LucideIcon} from '@/widget/common/lucide';
import BrightnessSlider from '@/widget/control-center/widget/BrightnessSlider';
import MediaCard from '@/widget/control-center/widget/MediaCard';
import QuickToggles from '@/widget/control-center/widget/QuickToggles';
import ScreenCapture from '@/widget/control-center/widget/ScreenCapture';
import SystemMetrics from '@/widget/control-center/widget/SystemMetrics';
import UpdatesCard from '@/widget/control-center/widget/UpdatesCard';
import VolumeSlider from '@/widget/control-center/widget/VolumeSlider';

export interface ControlCenterContentProps {
  onOpenPage: (page: ControlCenterDetailPage) => void;
}

export default function ControlCenterContent({onOpenPage}: ControlCenterContentProps) {
  return (
    <box class="cc-main-panel" orientation={Gtk.Orientation.VERTICAL} spacing={11} vexpand>
      <box class="cc-main-header" spacing={12} hexpand>
        <LucideIcon name="settings-2" pixelSize={24} />
        <label label="Control Center" class="cc-title" />
      </box>
      <scrolledwindow
        class="left-panel-scroll"
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.EXTERNAL}
        vexpand
        propagateNaturalHeight={false}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={16}>
          <QuickToggles
            onOpenWifi={() => onOpenPage('wifi')}
            onOpenBluetooth={() => onOpenPage('bluetooth')}
          />
          <VolumeSlider onOpenSound={() => onOpenPage('sound')} />
          <BrightnessSlider />
          <MediaCard />
          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={16}>
            <SystemMetrics />
          </box>
          <UpdatesCard />
          <ScreenCapture />
        </box>
      </scrolledwindow>
    </box>
  );
}
