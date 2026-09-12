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
Ryprland installs the dependencies and provides its own extended `theme-switch.sh`, which also
updates the rest of the desktop theme.

## Installation (Standalone)

Skip this section when using Ryprland.

Run the installer to symlink `theme-switch.sh` into `${XDG_BIN_HOME:-$HOME/.local/bin}`:

```bash
./theme-switcher/install.sh
```

Ensure `~/.local/bin` is in your `$PATH`.

The script uses its bundled Matugen template and does not require a user-wide
`~/.config/matugen/config.toml`.

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
