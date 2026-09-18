import {createComputed} from 'ags';

import {scaleUiSize} from '@/lib/uiScale';
import {
  themeMode,
  themeModeBusy,
  themeModeError,
  themeSwitcherAvailable,
  toggleThemeMode,
} from '@/stores/system/themeMode';
import {LucideIcon} from '@/widget/common/lucide';

export default function ThemeModeButton() {
  const status = createComputed(() => {
    if (!themeSwitcherAvailable) return 'Unavailable';
    if (themeModeBusy()) return 'Switching…';
    if (themeModeError()) return 'Retry';
    return themeMode() === 'light' ? 'Light' : 'Dark';
  });

  return (
    <button
      class="cc-theme-mode-btn"
      sensitive={themeModeBusy.as(busy => themeSwitcherAvailable && !busy)}
      onClicked={() => void toggleThemeMode().catch(() => {})}
      tooltipText="Toggle Light / Dark Appearance"
    >
      <box spacing={scaleUiSize(6)}>
        <LucideIcon
          name={themeMode.as(mode => (mode === 'light' ? 'sun' : 'moon'))}
          pixelSize={14}
        />
        <label label={status} />
      </box>
    </button>
  );
}
