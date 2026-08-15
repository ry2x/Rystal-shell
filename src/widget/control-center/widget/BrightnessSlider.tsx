import {
  brightness,
  cycleBrightnessPreset,
  setBrightness,
  toggleBrightnessDim,
} from '../../../stores/brightness';
import { LucideIcon } from '../../../widget/common/lucide';

function getBrightnessIcon(value: number) {
  if (value <= 0.2) return 'sun-dim';
  if (value <= 0.8) return 'sun';
  return 'sun-medium';
}

export default function BrightnessSlider() {
  const icon = brightness.as(getBrightnessIcon);

  return (
    <box class="cc-card" spacing={16}>
      <button
        class="icon-btn"
        tooltipText="Dim to 0% / restore previous brightness"
        onClicked={toggleBrightnessDim}
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
          setBrightness(val);
        }}
      />

      <button
        class="icon-btn"
        css="min-width: 40px; padding: 4px; font-weight: 700; border-radius: 10px;"
        tooltipText="Cycle brightness presets"
        onClicked={cycleBrightnessPreset}
      >
        <label label={brightness.as((v) => `${Math.round(v * 100)}%`)} />
      </button>
    </box>
  );
}
