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
# Set a specific wallpaper
theme-switch.sh set /path/to/wallpaper.jpg

# Set a random wallpaper from $RYSTAL_SHELL_WALLPAPER_DIR (or ~/Pictures/Wallpapers)
theme-switch.sh random

# Refresh colors with current wallpaper
theme-switch.sh refresh
```
