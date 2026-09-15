# Standalone installation

Use this guide to install Rystal-shell without Ryprland. Run the commands from this repository's
root after cloning.

> [!IMPORTANT]
> For an existing Ryprland installation, use its deployment helper instead of these standalone installers.

## Requirements

A running Hyprland session and a working AGS/GTK4 environment are required. The package names below
follow the project's Arch Linux setup. Install them using your package manager, including AUR
support where needed.

| Packages                                      | Purpose                                      |
| --------------------------------------------- | -------------------------------------------- |
| `git`                                         | Clone the source                             |
| `aylurs-gtk-shell-git`, `libastal-meta`       | AGS, Gnim, and Astal runtime libraries       |
| `nodejs`, `pnpm`                              | Build tools; Node.js 24 or later is required |
| `dart-sass`                                   | Compile styles                               |
| `imagemagick`, `webp-pixbuf-loader`, `gsound` | Image processing, WebP loading, and sounds   |

> [!IMPORTANT]
> Install the system runtime before running `pnpm install`.
> `package.json` resolves AGS and Gnim from `/usr/share/ags/js`.

Install the packages for the controls you use:

| Feature                                 | Packages                                                            |
| --------------------------------------- | ------------------------------------------------------------------- |
| Wallpaper and generated colors          | `awww`, `matugen`, `util-linux` (`flock`)                           |
| Backlight / external monitor brightness | `brightnessctl` / `ddcutil`                                         |
| Network controls                        | `networkmanager`, `nm-connection-editor`                            |
| Bluetooth controls                      | `bluez`, `blueman`                                                  |
| Audio controls                          | `pipewire`, `pipewire-pulse`, `wireplumber`, `pavucontrol`          |
| Recording and region selection          | `wf-recorder`, `slurp`                                              |
| System monitor                          | `kitty`, `bottom` (`btm`)                                           |
| Idle handling                           | `hypridle` or `swayidle`; see [Session integration](integration.md) |

The default update-manager command is `kitty --title PacUpdate par_tui`. Install those tools or
set `externalApps.updateManager` to your preferred command. External application shortcuts are
configurable; see [Configuration](../config/README.md).

## Clone and deploy

```sh
git clone https://github.com/ry2x/Rystal-shell.git
cd Rystal-shell
pnpm install
pnpm deploy:user
pnpm install:launcher
```

`deploy:user` builds and deploys the bundle, assets, and styles to
`${XDG_DATA_HOME:-$HOME/.local/share}/rystal-shell`.

> [!NOTE]
> Deployment does not create user configuration or restart an existing instance.
> The previous deployment is kept in the adjacent `rystal-shell.previous` directory until the next deployment.

`install:launcher` installs `rystal-shell` in `${XDG_BIN_HOME:-$HOME/.local/bin}`. It refuses to
replace an unmanaged launcher. Ensure this directory is in your session's `PATH`:

```sh
export PATH="${XDG_BIN_HOME:-$HOME/.local/bin}:$PATH"
```

Persist that setting in your session environment if it is not already present.

## Configure and start

Rystal-shell runs with built-in defaults when no user configuration exists. To customize it, follow
[Configuration](../config/README.md). No source edits are required.

From a terminal inside your Hyprland session:

```sh
rystal-shell
```

For automatic startup, see [Session integration](integration.md). To enable wallpaper selection and
light/dark switching, complete the separate [theme switcher setup](../theme-switcher/README.md).

## Update an existing deployment

After updating the checkout, rerun `pnpm install` and `pnpm deploy:user`. Restart the deployed
instance to load the new bundle:

```sh
ags quit -i "${RYSTAL_SHELL_INSTANCE:-rystal-shell}"
rystal-shell
```

The quit command assumes the instance is running. User configuration remains in the config directory.

> [!IMPORTANT]
> A custom `RYSTAL_SHELL_DATA_DIR` changes where the launcher looks, but `deploy:user`
> always writes under `XDG_DATA_HOME`. Keep those paths aligned to load the updated bundle.

[Back to overview](../README.md)
