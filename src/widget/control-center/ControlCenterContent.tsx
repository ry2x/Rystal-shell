import {Gtk} from 'ags/gtk4';

import {type ControlCenterDetailPage} from '../../stores/panel/controlCenter';
import {LucideIcon} from '../../widget/common/lucide';
import BrightnessSlider from './widget/BrightnessSlider';
import MediaCard from './widget/MediaCard';
import QuickToggles from './widget/QuickToggles';
import ScreenCapture from './widget/ScreenCapture';
import SystemMetrics from './widget/SystemMetrics';
import UpdatesCard from './widget/UpdatesCard';
import VolumeSlider from './widget/VolumeSlider';

export interface ControlCenterContentProps {
  onOpenPage: (page: ControlCenterDetailPage) => void;
}

export default function ControlCenterContent({onOpenPage}: ControlCenterContentProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={16}>
      <box spacing={12} halign={Gtk.Align.START}>
        <LucideIcon name="settings-2" pixelSize={24} />
        <label label="Control Center" class="cc-title" />
      </box>
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
  );
}
