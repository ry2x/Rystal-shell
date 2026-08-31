import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {cpuUsage, gpuUsage, openSystemMonitor, ramUsage} from '@/stores/system/system';
import type {RamData} from '@/stores/system/system';
import CircularProgress from '@/widget/common/CircularProgress';

export interface SystemMetricsProps {
  uiScale: UiScaleContext;
}
export default function SystemMetrics({uiScale}: SystemMetricsProps) {
  return (
    <box
      class="cc-card"
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={uiScale.size(16)}
      homogeneous
      hexpand
    >
      <box halign={Gtk.Align.CENTER}>
        <button class="cc-metric-button" onClicked={openSystemMonitor}>
          <CircularProgress
            variable={cpuUsage}
            transformer={(c: number) => c / 100}
            icon="cpu"
            label="CPU"
            sublabel={cpuUsage.as(c => `${Math.round(c)}%`)}
            cssClass="cpu-progress"
            uiScale={uiScale}
          />
        </button>
      </box>

      <box halign={Gtk.Align.CENTER}>
        <button class="cc-metric-button" onClicked={openSystemMonitor}>
          <CircularProgress
            variable={ramUsage}
            transformer={(r: RamData) => r.percent}
            icon="memory-stick"
            label="RAM"
            sublabel={ramUsage.as(r => `${r.used.toFixed(1)} / ${r.total.toFixed(0)}GB`)}
            cssClass="ram-progress"
            uiScale={uiScale}
          />
        </button>
      </box>

      <box halign={Gtk.Align.CENTER}>
        <button class="cc-metric-button" onClicked={openSystemMonitor}>
          <CircularProgress
            variable={gpuUsage}
            transformer={(g: number) => g / 100}
            icon="gpu"
            label="GPU"
            sublabel={gpuUsage.as(g => `${Math.round(g)}%`)}
            cssClass="gpu-progress"
            uiScale={uiScale}
          />
        </button>
      </box>
    </box>
  );
}
