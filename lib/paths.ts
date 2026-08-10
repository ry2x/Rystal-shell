import GLib from 'gi://GLib?version=2.0';

const IDENTIFIER = 'ryprland';

function configuredDirectory(name: string, fallback: string) {
  return GLib.getenv(name) || fallback;
}

export const ryprlandCacheDir = configuredDirectory(
  'RYPRLAND_CACHE_DIR',
  `${GLib.get_user_cache_dir()}/${IDENTIFIER}`,
);

export const ryprlandStateDir = configuredDirectory(
  'RYPRLAND_STATE_DIR',
  `${GLib.get_user_state_dir()}/${IDENTIFIER}`,
);

const runtimeBase = GLib.get_user_runtime_dir();
const runtimeFallback = runtimeBase
  ? `${runtimeBase}/${IDENTIFIER}`
  : `${GLib.get_tmp_dir()}/${IDENTIFIER}-${GLib.get_user_name()}`;

export const ryprlandRuntimeDir = configuredDirectory('RYPRLAND_RUNTIME_DIR', runtimeFallback);

export const ryprlandWallpaperDir = configuredDirectory(
  'RYPRLAND_WALLPAPER_DIR',
  `${GLib.get_home_dir()}/Pictures/Wallpapers`,
);
