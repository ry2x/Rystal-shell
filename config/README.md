# Configuration

Rystal-shell reads `config.json` once at startup. Restart the instance after editing it. Without a
configuration file, it uses the defaults in [defaults.ts](../src/lib/config/defaults.ts).

Object properties are merged with defaults; arrays such as `worldClocks` replace the entire default
array. Invalid values fall back to defaults, unknown keys produce warnings, and an unreadable or
invalid JSON file falls back to the full default configuration. See [parser.ts](../src/lib/config/parser.ts).

## Create user configuration

From the repository root, copy the template only if you do not already have a configuration:

```sh
config_dir="${RYSTAL_SHELL_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/rystal-shell}"
mkdir -p "$config_dir"
if [ ! -e "$config_dir/config.json" ]; then
  cp config/config.json.template "$config_dir/config.json"
fi
```

The template uses Tokyo as an example weather location; the built-in default is an empty string.
You can instead create a minimal JSON file containing only your overrides:

```json
{
  "ui": {"scale": 1.25},
  "weather": {"location": "Tokyo"}
}
```

## Options

| Setting                          | Default                                 | Accepted value / purpose                            |
| -------------------------------- | --------------------------------------- | --------------------------------------------------- |
| `ui.scale`                       | `1`                                     | `0.75`, `1`, `1.25`, `1.5`, or `2`                  |
| `weather.location`               | `""`                                    | Location string; empty uses IP-based location       |
| `notifications.maxCount`         | `30`                                    | Positive integer; persistent notification limit     |
| `brightness.backend`             | `"auto"`                                | `auto`, `brightnessctl`, or `ddcutil`               |
| `externalApps.audioControl`      | `"pavucontrol"`                         | Sound settings command                              |
| `externalApps.bluetoothSettings` | `"blueman-manager"`                     | Bluetooth settings command                          |
| `externalApps.wifiSettings`      | `"nm-connection-editor"`                | Network settings command                            |
| `externalApps.updateManager`     | `"kitty --title PacUpdate par_tui"`     | Package updater command                             |
| `worldClocks`                    | London, Brisbane, New York, Los Angeles | Array of objects with `label` and IANA `tz` strings |
| `recorder.savePath`              | `"~/Videos"`                            | Recording output directory                          |
| `recorder.filenameFormat`        | `"recording_%Y-%m-%d_%H.%M.%S.mp4"`     | Recording filename format                           |
| `recorder.recordAudio`           | `true`                                  | Boolean                                             |
| `recorder.audioSource`           | `"system"`                              | `system` or `mic`                                   |
| `profile.avatarPath`             | `"~/Profile/Profile.png"`               | Avatar path; a 512×512 PNG is suggested             |
| `profile.handle`, `profile.os`   | Unset                                   | Optional profile display strings                    |

External application commands are parsed into arguments without invoking a shell. Quoted arguments
and backslash escapes are supported; pipes, redirects, and environment-variable expansion are not.
Choose commands available on your system, especially when installing independently of Ryprland.

See the [full template](config.json.template) for a complete JSON example.

## Directory overrides

Set overrides in the environment before starting the shell, its launcher, or its theme switcher.
They are separate from `config.json`.

| Variable                     | Default                                              | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `RYSTAL_SHELL_CONFIG_DIR`    | `${XDG_CONFIG_HOME:-$HOME/.config}/rystal-shell`     | `config.json`, generated `theme.scss`, custom assets |
| `RYSTAL_SHELL_DATA_DIR`      | `${XDG_DATA_HOME:-$HOME/.local/share}/rystal-shell`  | Runtime bundle, default styles, assets               |
| `RYSTAL_SHELL_INSTANCE`      | `rystal-shell`                                       | AGS instance name and IPC target                     |
| `RYSTAL_SHELL_CACHE_DIR`     | `${XDG_CACHE_HOME:-$HOME/.cache}/rystal-shell`       | Wallpaper and media caches                           |
| `RYSTAL_SHELL_STATE_DIR`     | `${XDG_STATE_HOME:-$HOME/.local/state}/rystal-shell` | Application history and theme mode / wallpaper state |
| `RYSTAL_SHELL_RUNTIME_DIR`   | `$XDG_RUNTIME_DIR/rystal-shell` in a normal session  | Compiled CSS, locks, Caffeine Remote marker          |
| `RYSTAL_SHELL_WALLPAPER_DIR` | `$HOME/Pictures/Wallpapers`                          | Wallpaper scan directory                             |

The application resolves XDG roots through GLib; see [paths.ts](../src/lib/paths.ts). The standalone
switcher falls back to `/tmp/rystal-shell-$UID/theme` for its runtime files when neither runtime
variable is set. Set `RYSTAL_SHELL_RUNTIME_DIR` explicitly when integrating outside a normal XDG
session so all components share a root.

`RYSTAL_SHELL_DATA_DIR` changes runtime lookup, while the deployment script always installs under
`XDG_DATA_HOME`. `XDG_BIN_HOME` controls where the launcher and standalone switcher are installed,
with `$HOME/.local/bin` as the fallback.

[Back to overview](../README.md)
