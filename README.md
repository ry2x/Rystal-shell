# Rystal-Shell

**Rystal-Shell** is a part of the GUI shell for [Ryprland](https://github.com/ry2x/Ryprland-dot/).
This shell is based on [Aylur's GTK Shell](https://github.com/aylur/ags) called AGS.

https://github.com/user-attachments/assets/8cb65a27-2284-4302-b0b1-8c1be2ef4631

> [!NOTE]
> [WHY AGS? AND ABOUT MEMORY CONSUMPTION](#why-ags-was-chosen-and-its-memory-consumption)

## Requirements

### Ryprland users

When installed as part of [Ryprland](https://github.com/ry2x/Ryprland-dot/), this repository is
managed as a submodule. Ryprland installs the required packages, deploys Rystal-shell, installs
its launcher, and provides its extended `theme-switch.sh`. Do not run the standalone launcher or
theme-switcher installers manually; follow Ryprland's installation instructions instead.

### Standalone users

The following packages are required to build and use Rystal-shell on its own:

- [aylurs-gtk-shell-git](https://aur.archlinux.org/packages/aylurs-gtk-shell-git)
- [libastal-meta](https://aur.archlinux.org/packages/libastal-meta)
- `dart-sass`
- `imagemagick`
- `webp-pixbuf-loader`
- `gsound`
- `pnpm` (build and development)

The bundled wallpaper and theme switcher additionally requires:

- `awww`
- `matugen`
- `util-linux` (`flock`)

Individual shell features may require their corresponding system tools, such as
`brightnessctl` or `ddcutil`, NetworkManager, BlueZ, PipeWire/WirePlumber, `slurp`, and
`wf-recorder`.

```sh
# for Arch Linux
paru -S aylurs-gtk-shell-git libastal-meta dart-sass imagemagick awww matugen util-linux pnpm webp-pixbuf-loader gsound
```

### Build, Deploy, and Start

These commands are for standalone installation. Ryprland users do not need to run them.

Build and deploy the runtime bundle, static assets, and styles to
`${XDG_DATA_HOME:-$HOME/.local/share}/rystal-shell`:

```sh
pnpm install
pnpm deploy:user
pnpm install:launcher
```

Place user configuration in `${XDG_CONFIG_HOME:-$HOME/.config}/rystal-shell`, then start the
deployed shell with `rystal-shell`. The launcher is owned and installed by this repository.

In practice, it relies on Hyprland's autostart capabilities.
When doing so, you need to account for the lag associated with loading the modules.
Therefore, you must introduce a startup delay as shown below:

```lua
-- hyprland.lua
hl.on("hyprland.start",
  function()
    hl.exec_cmd("sleep 5; rystal-shell")
    hl.exec_cmd("sleep 10; blueman-applet")
  end
)
```

### Configuration

Look at [config/README.md](/config/README.md) for details on how to configure Rystal-shell.

### Theme Switcher & Wallpaper Pipeline

Rystal-shell's Wallpaper Selector integrates with `theme-switch.sh` to update colors via Matugen, change wallpaper via `awww`, and reload CSS.

- **Standalone setup**: Symlink `theme-switch.sh` into `~/.local/bin/` by running `./theme-switcher/install.sh`.
- **Ryprland setup**: No manual installation is required. Ryprland provides and installs its own extended implementation.
- If `theme-switch.sh` is not installed or not in `$PATH`, wallpaper selection will safely display an error without modifying external state.
- Details: [theme-switcher/README.md](/theme-switcher/README.md)

The bundled standalone switcher updates only Rystal-shell. Ryprland and other desktop
configurations may provide a more extensive implementation with the same command-line interface.

### Caffeine integration

Caffeine cycles through three states:

- **Disabled**: The detected idle daemon runs normally.
- **Enabled**: Rystal-shell stops the idle daemon, so this mode works standalone.
- **Remote**: Rystal-shell restarts the idle daemon and creates
  `$RYSTAL_SHELL_RUNTIME_DIR/caffeine-remote`. This mode works only when the external suspend
  command honors that marker.

Rystal-shell does not install or replace a system suspend hook. Integrators that want Remote mode
can check the marker before suspending:

```sh
runtime_root="${RYSTAL_SHELL_RUNTIME_DIR:-$XDG_RUNTIME_DIR/rystal-shell}"
[[ -f "$runtime_root/caffeine-remote" ]] && exit 0
systemctl suspend
```

### Environment Variables & Directory Roots

Rystal-shell uses `RYSTAL_SHELL_*` environment variables for directory configuration, falling back to standard XDG directories:

| Environment Variable         | Default Fallback                                     | Purpose                                                         |
| ---------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `RYSTAL_SHELL_CONFIG_DIR`    | `${XDG_CONFIG_HOME:-$HOME/.config}/rystal-shell`     | User configuration (`config.json`, `theme.scss`, custom assets) |
| `RYSTAL_SHELL_DATA_DIR`      | `${XDG_DATA_HOME:-$HOME/.local/share}/rystal-shell`  | Deployed runtime bundle, default styles, and assets             |
| `RYSTAL_SHELL_INSTANCE`      | `rystal-shell`                                       | AGS instance name for IPC (`ags request -i ...`)                |
| `RYSTAL_SHELL_CACHE_DIR`     | `${XDG_CACHE_HOME:-$HOME/.cache}/rystal-shell`       | Wallpaper thumbnails and MPRIS media cache                      |
| `RYSTAL_SHELL_STATE_DIR`     | `${XDG_STATE_HOME:-$HOME/.local/state}/rystal-shell` | Application history                                             |
| `RYSTAL_SHELL_RUNTIME_DIR`   | `$XDG_RUNTIME_DIR/rystal-shell`                      | Compiled CSS, runtime locks, and Caffeine Remote marker         |
| `RYSTAL_SHELL_WALLPAPER_DIR` | `$HOME/Pictures/Wallpapers`                          | Wallpaper selector scan directory                               |

## Development

`pnpm dev` starts the `rystal-shell-dev` AGS instance with config, cache, state, and runtime
data isolated below `.dev/`. Optionally run `direnv allow` to load the same environment while
working in the repository.

Run the static checks before submitting changes:

```sh
pnpm check
pnpm build
```

The minimum checks to run before creating a commit are:

```sh
pnpm check
pnpm build
git diff --check
```

`pnpm check` runs Prettier's check mode, ESLint, Knip, and the project type check.
Use `pnpm format` to apply formatting before running the checks again.

`pnpm check` ignores the following 2 known upstream type errors:

> `../../../usr/share/ags/js/lib/gtk4/app.ts:288`
> `../../../usr/share/ags/js/node_modules/gnim/dist/jsx/state.ts:715`

Use `pnpm run tsc` when you need the raw TypeScript output, including those upstream errors.

## Why AGS was chosen and its memory consumption

Maybe some people are wondering, "Why AGS? Why not QuickShell?"

Recently, QuickShell has become increasingly popular in the Hyprland community. Its memory efficiency and beautiful animations are definitely compelling reasons to choose it.

However, I'm still a beginner with both GTK and Qt. One of the main reasons I chose AGS was that I wanted to learn GObject, one of GTK's core strengths. Since I already had experience with React, I was also interested in understanding how GTK development differs from web development.

I've been reading the GJS and Gnim documentation and doing my best to avoid memory leaks wherever possible.

For those interested, here are the memory usage numbers I've observed, including the worst-case scenario:

- **Typical case:**
  - `around 270 ~ 350 MB` (usually around 300 MB)

- **Worst case:**
  - `around 350 ~ 450 MB` (I have never seen it exceed around 450 MB with `maxCount = 30`)

## License

Rystal-shell's original source code is licensed under the
[GNU General Public License v3.0 or later](LICENSE).

The Lucide icon assets under `assets/icons/` retain their upstream ISC and MIT
license terms. See [Third-Party Notices](THIRD_PARTY_NOTICES.md) and the
[Lucide license text](assets/icons/LUCIDE_LICENSE) for details.
