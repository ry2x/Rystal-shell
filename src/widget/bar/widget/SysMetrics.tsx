import {Gdk, Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import {toggleControlCenter} from '@/stores/shell/windowManager';
import {cpuUsage, gpuUsage, ramUsage} from '@/stores/system/system';
import {LucideIcon} from '@/widget/common/lucide';

export interface SysMetricsProps {
  monitor: Gdk.Monitor;
  uiScale: UiScaleContext;
}

function formatPercent(value: number) {
  const rounded = Math.round(value);
  const capped = rounded >= 100 ? 99 : rounded;
  return capped.toString().padStart(2, '0');
}

export default function SysMetrics({monitor, uiScale}: SysMetricsProps) {
  const toggleMenu = () => {
    toggleControlCenter(monitor.get_connector());
  };

  return (
    <button class="SysMetrics" onClicked={toggleMenu}>
      <box spacing={uiScale.size(10)} orientation={Gtk.Orientation.VERTICAL}>
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
        <box spacing={0} orientation={Gtk.Orientation.VERTICAL}>
          <LucideIcon name="gpu" class="icon metric-icon" />
          <label label={gpuUsage.as(formatPercent)} class="metric-value" />
          <label label="%" class="metric-unit" />
        </box>
      </box>
    </button>
  );
}
