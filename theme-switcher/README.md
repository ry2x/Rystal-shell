# Theme Switcher for Rystal-Shell

`theme-switch.sh` is the minimal theme and wallpaper pipeline consumed by Rystal-shell's Wallpaper Selector.

It coordinates:

1. **Wallpaper rendering**: Displays animated wallpaper transitions via `awww`.
2. **Shell colors**: Generates only Rystal-shell's `theme.scss` from the bundled Matugen template.
3. **Shell assets**: Generates Rystal-shell's launcher background via ImageMagick (`magick`).
4. **Hot reload**: Requests the running Rystal-shell instance to reload its CSS.

It does not theme Rofi, Kitty, Bat, Hyprland, or other applications. A desktop configuration
that needs broader theme synchronization should provide its own `theme-switch.sh` earlier in
`$PATH`.

## Requirements

These dependencies are required only when installing the standalone theme switcher:

- `awww`
- `matugen`
- `imagemagick` (`magick`)
- `util-linux` (`flock`)

If Rystal-shell is installed through Ryprland, no setup in this directory is necessary.
Follow Ryprland’s package and installation guide; it provides its own extended `theme-switch.sh`, which also
updates the rest of the desktop theme.

## Installation (Standalone)

Skip this section when using Ryprland.

From the Rystal-shell repository root, run the installer to symlink `theme-switch.sh` into `${XDG_BIN_HOME:-$HOME/.local/bin}`:

```bash
./theme-switcher/install.sh
```

Ensure `${XDG_BIN_HOME:-$HOME/.local/bin}` is in your session's `PATH`. The installer replaces any
existing `theme-switch.sh` at that path with a symlink, so use it only when this standalone switcher
should own the command. Keep this checkout in place: the symlink uses the script and templates here.

The script uses its bundled Matugen template and does not require a user-wide
`~/.config/matugen/config.toml`.

## First wallpaper

Start `awww-daemon` in your Wayland session if it is not already running, then apply an existing image:

```bash
awww-daemon &
# Run after the daemon is ready; replace this with an existing image path.
theme-switch.sh set /path/to/wallpaper.jpg
```

The switcher does not start the daemon. Add it to your session autostart for subsequent logins.
`refresh`, `mode`, and `toggle` require a wallpaper recorded by a successful `set` or `random` call;
they cannot initialize colors from an empty state. `status` can be used before setup and returns `dark`.

## Usage

```bash
# Set a specific wallpaper using the saved mode
theme-switch.sh set /path/to/wallpaper.jpg

# Set a random wallpaper without changing the saved mode
theme-switch.sh random

# Refresh colors with the current wallpaper and saved mode
theme-switch.sh refresh

# Apply and save a mode using the current wallpaper
theme-switch.sh mode light
theme-switch.sh mode dark

# Toggle and display the saved mode
theme-switch.sh toggle
theme-switch.sh status

# Compatibility syntax: explicitly select and save a mode while changing a wallpaper
theme-switch.sh --light set /path/to/wallpaper.jpg
```

The selected mode is stored in `${RYSTAL_SHELL_STATE_DIR}/theme/mode`, or in
`${XDG_STATE_HOME:-$HOME/.local/state}/rystal-shell/theme/mode` when the Rystal-shell state
directory is not overridden. `set`, `random`, and `refresh` reuse this value. Existing
installations without a saved value default to `dark`.

The bundled switcher defines the command-line and state-file contract used by desktop
integrators, but it updates only Rystal-shell. An integrator such as Ryprland may apply the same
mode to GTK, Qt, and other applications in its extended implementation.

Rystal-shell's Control Center exposes the same light/dark operation through its Appearance
toggle. It reads the switcher's saved state instead of maintaining a second configuration value,
and refreshes when the state file is changed by an external command.

## Files and session behavior

The switcher writes `theme.scss` and `assets/launcher_bg.png` below the Rystal-shell config directory.
It records `current-wallpaper` and `mode` below the state directory's `theme/` subdirectory.
Directory overrides are described in [Configuration](../config/README.md#directory-overrides).

`set` and `random` change the wallpaper through `awww`. `refresh`, `mode`, and `toggle` regenerate
shell colors and assets from the recorded image without restoring the wallpaper daemon's state.
Use the daemon's own restoration mechanism when configuring login behavior.

`random` scans the wallpaper directory recursively for JPG, JPEG, PNG, WebP, and GIF files. CSS
reload targets `RYSTAL_SHELL_INSTANCE` (default `rystal-shell`) when that AGS instance is running.

[Back to overview](../README.md)
