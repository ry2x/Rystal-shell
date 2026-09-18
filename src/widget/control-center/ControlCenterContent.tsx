import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {type ControlCenterDetailPage} from '@/stores/panel/controlCenter';
import {LucideIcon} from '@/widget/common/lucide';
import BrightnessSlider from '@/widget/control-center/widget/BrightnessSlider';
import MediaCard from '@/widget/control-center/widget/MediaCard';
import QuickToggles from '@/widget/control-center/widget/QuickToggles';
import ScreenCapture from '@/widget/control-center/widget/ScreenCapture';
import SystemMetrics from '@/widget/control-center/widget/SystemMetrics';
import ThemeModeButton from '@/widget/control-center/widget/ThemeModeButton';
import UpdatesCard from '@/widget/control-center/widget/UpdatesCard';
import VolumeSlider from '@/widget/control-center/widget/VolumeSlider';

export interface ControlCenterContentProps {
  onOpenPage: (page: ControlCenterDetailPage) => void;
  monitorConnector: string;
}

export default function ControlCenterContent({
  onOpenPage,
  monitorConnector,
}: ControlCenterContentProps) {
  return (
    <box
      class="cc-main-panel"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={scaleUiSize(11)}
      hexpand
      vexpand
      halign={Gtk.Align.FILL}
    >
      <box class="cc-main-header" spacing={scaleUiSize(8)} hexpand>
        <LucideIcon name="settings-2" pixelSize={20} />
        <label
          label="Control Center"
          class="cc-title"
          halign={Gtk.Align.START}
          xalign={0}
          hexpand
        />
        <ThemeModeButton />
      </box>
      <scrolledwindow
        class="left-panel-scroll"
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.EXTERNAL}
        vexpand
        propagateNaturalHeight={false}
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={scaleUiSize(16)}
          marginStart={scaleUiSize(12)}
          marginEnd={scaleUiSize(12)}
        >
          <QuickToggles
            onOpenWifi={() => onOpenPage('wifi')}
            onOpenBluetooth={() => onOpenPage('bluetooth')}
          />
          <VolumeSlider
            monitorConnector={monitorConnector}
            onOpenSound={() => onOpenPage('sound')}
          />
          <BrightnessSlider monitorConnector={monitorConnector} />
          <MediaCard />
          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={scaleUiSize(16)}>
            <SystemMetrics />
          </box>
          <UpdatesCard />
          <ScreenCapture />
        </box>
      </scrolledwindow>
    </box>
  );
}
