# Session integration

## Autostart

First verify that `rystal-shell` starts from a terminal in your Hyprland session. Add the command to
your compositor's startup configuration. For a Hyprland Lua configuration:

```lua
hl.on("hyprland.start", function()
  hl.exec_cmd("rystal-shell")
end)
```

> [!IMPORTANT]
> The session must provide the same `PATH` and directory overrides as your terminal.

A fixed startup delay is not a Rystal-shell requirement. Start optional services such as the wallpaper daemon and
idle daemon separately using your session configuration.

## Caffeine

Caffeine detects `hypridle` or `swayidle` and cycles through three states:

| State    | Behavior                                                                                     |
| -------- | -------------------------------------------------------------------------------------------- |
| Disabled | The idle daemon runs normally                                                                |
| Enabled  | Rystal-shell stops the detected idle daemon                                                  |
| Remote   | The daemon runs and a `caffeine-remote` marker asks an external suspend hook to skip suspend |

> [!WARNING]
> The adapter restarts the idle daemon by executable name without arguments. Custom `swayidle`
> arguments or a service that automatically restarts stopped processes need additional integration.

When no daemon is detected, the initial state is Enabled and the restart default is `hypridle`.

> [!IMPORTANT]
> Remote mode prevents suspend only if your suspend command checks the marker.
> Rystal-shell does not install this hook. Use the same runtime directory for the hook and the shell.

For example, in a session with `XDG_RUNTIME_DIR` set:

```sh
runtime_root="${RYSTAL_SHELL_RUNTIME_DIR:-${XDG_RUNTIME_DIR:?}/rystal-shell}"
[ -f "$runtime_root/caffeine-remote" ] && exit 0
systemctl suspend
```

See the [directory reference](../config/README.md#directory-overrides).

[Back to overview](../README.md)
