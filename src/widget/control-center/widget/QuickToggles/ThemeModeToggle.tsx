import {createComputed} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {
  themeMode,
  themeModeBusy,
  themeModeError,
  themeSwitcherAvailable,
  toggleThemeMode,
} from '@/stores/system/themeMode';
import {LucideIcon} from '@/widget/common/lucide';

export default function ThemeModeToggle() {
  const status = createComputed(() => {
    if (!themeSwitcherAvailable) return 'Unavailable';
    if (themeModeBusy()) return 'Switching…';
    if (themeModeError()) return 'Retry';
    return themeMode() === 'light' ? 'Light' : 'Dark';
  });

  return (
    <box
      class={themeMode.as(
        mode => `cc-toggle-btn cc-single-toggle ${mode === 'light' ? 'active' : ''}`
      )}
      spacing={0}
    >
      <button
        hexpand
        class="cc-toggle-button"
        sensitive={themeModeBusy.as(busy => themeSwitcherAvailable && !busy)}
        onClicked={() => void toggleThemeMode().catch(() => {})}
        tooltipText="Toggle Light / Dark Appearance"
      >
        <box spacing={scaleUiSize(12)}>
          <LucideIcon
            name={themeMode.as(mode => (mode === 'light' ? 'sun' : 'moon'))}
            class="icon"
            pixelSize={24}
          />
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label label="Appearance" class="cc-toggle-title" halign={Gtk.Align.START} />
            <label label={status} class="cc-toggle-status" halign={Gtk.Align.START} />
          </box>
        </box>
      </button>
    </box>
  );
}
