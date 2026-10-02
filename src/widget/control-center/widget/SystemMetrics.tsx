import {createComputed} from 'ags';
import {Gtk} from 'ags/gtk4';

import {getBatteryIcon, getBatteryTooltip} from '@/lib/battery';
import {appConfig} from '@/lib/config';
import {scaleUiSize} from '@/lib/uiScale';
import {batteryState} from '@/stores/system/battery';
import {cpuUsage, gpuUsage, openSystemMonitor, ramUsage} from '@/stores/system/system';
import type {RamData} from '@/stores/system/system';
import CircularProgress from '@/widget/common/CircularProgress';

export default function SystemMetrics() {
  const thirdMetric = createComputed(() => {
    const battery = appConfig.battery.show !== false ? batteryState() : null;
    return battery
      ? {
          percentage: battery.percentage,
          icon: getBatteryIcon(battery),
          label: 'Battery',
          tooltip: getBatteryTooltip(battery),
        }
      : {percentage: gpuUsage(), icon: 'gpu', label: 'GPU', tooltip: 'GPU usage'};
  });

  return (
    <box
      class="cc-card"
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={scaleUiSize(16)}
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
          />
        </button>
      </box>

      <box halign={Gtk.Align.CENTER}>
        <button
          class="cc-metric-button"
          onClicked={openSystemMonitor}
          tooltipText={thirdMetric.as(metric => metric.tooltip)}
        >
          <CircularProgress
            variable={thirdMetric.as(metric => metric.percentage)}
            transformer={(g: number) => g / 100}
            icon={thirdMetric.as(metric => metric.icon)}
            label={thirdMetric.as(metric => metric.label)}
            sublabel={thirdMetric.as(metric => `${Math.round(metric.percentage)}%`)}
            cssClass="gpu-progress"
          />
        </button>
      </box>
    </box>
  );
}
