import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
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
  uiScale: UiScaleContext;
}

export default function ControlCenterContent({onOpenPage, uiScale}: ControlCenterContentProps) {
  return (
    <box
      class="cc-main-panel"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={uiScale.size(11)}
      vexpand
    >
      <box class="cc-main-header" spacing={uiScale.size(12)} hexpand>
        <LucideIcon name="settings-2" pixelSize={24} uiScale={uiScale} />
        <label label="Control Center" class="cc-title" />
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
          spacing={uiScale.size(16)}
          marginStart={uiScale.size(12)}
          marginEnd={uiScale.size(12)}
        >
          <QuickToggles
            onOpenWifi={() => onOpenPage('wifi')}
            onOpenBluetooth={() => onOpenPage('bluetooth')}
            uiScale={uiScale}
          />
          <VolumeSlider onOpenSound={() => onOpenPage('sound')} uiScale={uiScale} />
          <BrightnessSlider uiScale={uiScale} />
          <MediaCard uiScale={uiScale} />
          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={uiScale.size(16)}>
            <SystemMetrics uiScale={uiScale} />
          </box>
          <UpdatesCard uiScale={uiScale} />
          <ScreenCapture uiScale={uiScale} />
        </box>
      </scrolledwindow>
    </box>
  );
}
