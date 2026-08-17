import GLib from 'gi://GLib?version=2.0';

const IDENTIFIER = 'rystal-shell';

function resolveDirectory(envName: string, fallbackPath: string): string {
  return GLib.getenv(envName) || fallbackPath;
}

export const rystalShellConfigDir = resolveDirectory(
  'RYSTAL_SHELL_CONFIG_DIR',
  `${GLib.get_user_config_dir()}/${IDENTIFIER}`
);

export const rystalShellDataDir = resolveDirectory(
  'RYSTAL_SHELL_DATA_DIR',
  `${GLib.get_user_data_dir()}/${IDENTIFIER}`
);

export const rystalShellInstance = resolveDirectory('RYSTAL_SHELL_INSTANCE', IDENTIFIER);

export const rystalShellCacheDir = resolveDirectory(
  'RYSTAL_SHELL_CACHE_DIR',
  `${GLib.get_user_cache_dir()}/${IDENTIFIER}`
);

export const rystalShellStateDir = resolveDirectory(
  'RYSTAL_SHELL_STATE_DIR',
  `${GLib.get_user_state_dir()}/${IDENTIFIER}`
);

const runtimeBase = GLib.get_user_runtime_dir();
const runtimeFallback = runtimeBase
  ? `${runtimeBase}/${IDENTIFIER}`
  : `${GLib.get_tmp_dir()}/${IDENTIFIER}-${GLib.get_user_name()}`;

export const rystalShellRuntimeDir = resolveDirectory('RYSTAL_SHELL_RUNTIME_DIR', runtimeFallback);

export const rystalShellWallpaperDir = resolveDirectory(
  'RYSTAL_SHELL_WALLPAPER_DIR',
  `${GLib.get_home_dir()}/Pictures/Wallpapers`
);
