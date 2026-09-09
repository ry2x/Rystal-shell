import {scaleUiSize} from '@/lib/uiScale';
import {
  brightness,
  cycleBrightnessPreset,
  setBrightness,
  toggleBrightnessDim,
} from '@/stores/system/brightness';
import {LucideIcon} from '@/widget/common/lucide';

function getBrightnessIcon(value: number) {
  if (value <= 0.2) return 'sun-dim';
  if (value <= 0.8) return 'sun-medium';
  return 'sun';
}

export interface BrightnessSliderProps {
  monitorConnector: string;
}

export default function BrightnessSlider({monitorConnector}: BrightnessSliderProps) {
  const icon = brightness.as(getBrightnessIcon);

  return (
    <box class="cc-card" spacing={scaleUiSize(16)}>
      <button
        class="icon-btn"
        tooltipText="Dim to 0% / restore previous brightness"
        onClicked={() => toggleBrightnessDim(monitorConnector)}
      >
        <LucideIcon name={icon} pixelSize={20} />
      </button>

      <slider
        class="brightness-slider"
        hexpand
        drawValue={false}
        min={0}
        max={1}
        value={brightness}
        onChangeValue={(_self, _scroll, val: number) => {
          setBrightness(val, monitorConnector);
        }}
      />

      <button
        class="icon-btn cc-value-button"
        tooltipText="Cycle brightness presets"
        onClicked={() => cycleBrightnessPreset(monitorConnector)}
      >
        <label label={brightness.as(v => `${Math.round(v * 100)}%`)} />
      </button>
    </box>
  );
}
