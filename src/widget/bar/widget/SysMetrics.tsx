import {createComputed} from 'ags';
import {Gdk, Gtk} from 'ags/gtk4';

import {getBatteryIcon, getBatteryTooltip} from '@/lib/battery';
import {appConfig} from '@/lib/config';
import {scaleUiSize} from '@/lib/uiScale';
import {toggleControlCenter} from '@/stores/shell/windowManager';
import {batteryState} from '@/stores/system/battery';
import {cpuUsage, gpuUsage, ramUsage} from '@/stores/system/system';
import {LucideIcon} from '@/widget/common/lucide';

export interface SysMetricsProps {
  monitor: Gdk.Monitor;
}

function formatPercent(value: number) {
  const rounded = Math.round(value);
  const capped = rounded >= 100 ? 99 : rounded;
  return capped.toString().padStart(2, '0');
}

export default function SysMetrics({monitor}: SysMetricsProps) {
  const thirdMetric = createComputed(() => {
    const battery = appConfig.battery.show !== false ? batteryState() : null;
    return battery
      ? {
          icon: getBatteryIcon(battery),
          value: Math.round(battery.percentage).toString().padStart(2, '0'),
          tooltip: getBatteryTooltip(battery),
        }
      : {icon: 'gpu', value: formatPercent(gpuUsage()), tooltip: 'GPU usage'};
  });
  const toggleMenu = () => {
    toggleControlCenter(monitor.get_connector());
  };

  return (
    <button class="SysMetrics" onClicked={toggleMenu}>
      <box spacing={scaleUiSize(10)} orientation={Gtk.Orientation.VERTICAL}>
        <box spacing={0} orientation={Gtk.Orientation.VERTICAL}>
          <LucideIcon name="cpu" class="icon metric-icon" />
          <label label={cpuUsage.as(formatPercent)} class="metric-value" />
          <label label="%" class="metric-unit" />
        </box>
        <box spacing={0} orientation={Gtk.Orientation.VERTICAL}>
          <LucideIcon name="memory-stick" class="icon metric-icon" />
          <label label={ramUsage.as(r => r.used.toFixed(1))} class="metric-value" />
          <label label="GB" class="metric-unit" />
        </box>
        <box
          spacing={0}
          orientation={Gtk.Orientation.VERTICAL}
          tooltipText={thirdMetric.as(metric => metric.tooltip)}
        >
          <LucideIcon name={thirdMetric.as(metric => metric.icon)} class="icon metric-icon" />
          <label label={thirdMetric.as(metric => metric.value)} class="metric-value" />
          <label label="%" class="metric-unit" />
        </box>
      </box>
    </button>
  );
}
