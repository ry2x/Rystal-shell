# Session integration

## Autostart

First verify that `rystal-shell` starts from a terminal in your Hyprland session. Add the command to
your compositor's startup configuration. For a Hyprland Lua configuration:

```lua
hl.on("hyprland.start", function()
  hl.exec_cmd("rystal-shell")
end)
```

The session must provide the same `PATH` and directory overrides as your terminal. A fixed startup
delay is not a Rystal-shell requirement. Start optional services such as the wallpaper daemon and
idle daemon separately using your session configuration.

## Caffeine

Caffeine detects `hypridle` or `swayidle` and cycles through three states:

| State    | Behavior                                                                                     |
| -------- | -------------------------------------------------------------------------------------------- |
| Disabled | The idle daemon runs normally                                                                |
| Enabled  | Rystal-shell stops the detected idle daemon                                                  |
| Remote   | The daemon runs and a `caffeine-remote` marker asks an external suspend hook to skip suspend |

The adapter restarts the daemon by its executable name without arguments. A custom `swayidle`
command line or a service that automatically restarts stopped processes needs integration beyond
this adapter. When no daemon is detected, the initial state is Enabled and the restart default is
`hypridle`.

Remote mode requires your suspend command to check the marker; Rystal-shell does not install a
suspend hook. For example, in a session with `XDG_RUNTIME_DIR` set:

```sh
runtime_root="${RYSTAL_SHELL_RUNTIME_DIR:-${XDG_RUNTIME_DIR:?}/rystal-shell}"
[ -f "$runtime_root/caffeine-remote" ] && exit 0
systemctl suspend
```

Use the same runtime directory for the hook and Rystal-shell. See the
[directory reference](../config/README.md#directory-overrides).

[Back to overview](../README.md)
