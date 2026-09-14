# Rystal-shell

Rystal-shell is a GTK4 desktop shell built with [AGS](https://github.com/aylur/ags) and Astal.
It provides panels, notifications, application and wallpaper launchers, and desktop controls.

It can be installed independently or as part of [Ryprland](https://github.com/ry2x/Ryprland-dot/).
Standalone installation requires no Ryprland dotfiles or helper scripts. The current implementation
uses Hyprland APIs for workspaces, window focus, notifications, and capture; standalone installation
still targets a Hyprland session.

[Demo video](https://github.com/user-attachments/assets/8cb65a27-2284-4302-b0b1-8c1be2ef4631)

## Getting started

- **Standalone:** follow [Installation](docs/installation.md) to install dependencies, build, and run.
- **Ryprland:** follow [Ryprland's installation guide](https://github.com/ry2x/Ryprland-dot/).
  Its deployment helper installs the Rystal-shell launcher, and its dotfiles provide an extended
  `theme-switch.sh`. Install the required packages as directed there; the helper does not install
  system packages. Skip the standalone installers in that setup.

## Documentation

- [Configuration](config/README.md): user settings and directory overrides
- [Theme switcher](theme-switcher/README.md): standalone wallpaper and color generation
- [Session integration](docs/integration.md): autostart and Caffeine
- [Development](docs/development.md): isolated development and validation commands
- [Design notes](docs/design.md): AGS choice and historical memory observations

## License

Rystal-shell's original source code is licensed under the
[GNU General Public License v3.0 or later](LICENSE).

The Lucide icon assets under `assets/icons/` retain their upstream ISC and MIT
license terms. See [Third-Party Notices](THIRD_PARTY_NOTICES.md) and the
[Lucide license text](assets/icons/LUCIDE_LICENSE) for details.
