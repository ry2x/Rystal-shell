import {createComputed} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {scaleUiSize} from '@/lib/uiScale';
import {osdContent, osdRevealed, osdVisible} from '@/stores/system/osd';
import {LucideIcon} from '@/widget/common/lucide';

export interface OsdProps {
  monitor: Gdk.Monitor;
}

function getBrightnessIcon(value: number) {
  if (value <= 0.2) return 'sun-dim';
  if (value <= 0.8) return 'sun';
  return 'sun-medium';
}

export default function Osd({monitor}: OsdProps) {
  const monitorConnector = monitor.get_connector() ?? '';
  const visible = createComputed(
    () => osdVisible() && osdContent()?.monitorConnector === monitorConnector
  );
  const value = osdContent.as(content => content?.value ?? 0);
  const icon = osdContent.as(content => {
    if (!content) return 'volume-2';
    if (content.kind === 'brightness') return getBrightnessIcon(content.value);
    if (content.kind === 'microphone') return content.muted ? 'mic-off' : 'mic';
    if (content.muted) return 'volume-x';
    if (content.value <= 0) return 'volume-x';
    if (content.value <= 0.33) return 'volume';
    if (content.value <= 0.66) return 'volume-1';
    return 'volume-2';
  });
  const label = osdContent.as(content => {
    if (!content) return '';
    if (content.kind !== 'brightness' && content.muted) return 'Muted';
    return `${Math.round(content.value * 100)}%`;
  });
  const levelClasses = osdContent.as(content =>
    content && content.kind !== 'brightness' && content.muted
      ? ['osd-level', 'muted']
      : ['osd-level']
  );
  const pillClasses = osdRevealed.as(revealed =>
    revealed ? ['osd-pill', 'revealed'] : ['osd-pill']
  );

  return (
    <window
      name={`osd-${monitorConnector}`}
      class="Osd"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.NONE}
      anchor={Astal.WindowAnchor.TOP}
      marginTop={0}
      application={app}
      visible={visible}
      canTarget={false}
      focusable={false}
    >
      <box class="osd-shadow-padding">
        <box cssClasses={pillClasses} spacing={scaleUiSize(10)}>
          <box class="osd-side" widthRequest={scaleUiSize(40)}>
            <LucideIcon
              name={icon}
              class="osd-icon"
              pixelSize={18}
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.CENTER}
              hexpand
              vexpand
            />
          </box>
          <levelbar
            cssClasses={levelClasses}
            mode={Gtk.LevelBarMode.CONTINUOUS}
            minValue={0}
            maxValue={1}
            value={value}
            hexpand
            valign={Gtk.Align.CENTER}
          />
          <box class="osd-side" widthRequest={scaleUiSize(40)}>
            <label
              class="osd-value"
              label={label}
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.CENTER}
              hexpand
            />
          </box>
        </box>
      </box>
    </window>
  );
}
