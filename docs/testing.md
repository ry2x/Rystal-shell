# Isolated testing

Use these commands from the repository root to check changes without deploying them or connecting
shell controls to the active desktop. `pnpm dev` isolates Rystal-shell's directories, but still
shares the active session's notification bus, audio, devices and compositor. Use the sandbox for
experiments that require isolation.

## Requirements

Install the normal [build requirements](installation.md#requirements) and project dependencies
beforehand. The sandbox also needs `bubblewrap` and `dbus-run-session`. UI trials require an active
Wayland session, `Hyprland`, `hyprctl`, `notify-send`, `awww`, `awww-daemon`, `magick`, `matugen`,
and accessible GPU render nodes. Nothing is
installed automatically. Corepack/pnpm must already be available offline.

The kernel must allow Bubblewrap's user, process and network namespaces. If isolation or any
dependency is unavailable, the command fails without falling back to the active desktop. A
restricted execution environment may need permission to create namespaces even when the desktop
terminal can run the command normally.

## Checks without a desktop

```sh
# Inspect the plan: creates no files and requires no runtime dependencies.
bash scripts/sandbox.sh check --dry-run

# Check namespace, D-Bus and filesystem isolation without opening a window.
pnpm sandbox:probe

# Formatting, lint, Knip, type checking, Node tests, and a bundle/CSS build.
pnpm sandbox:check
```

Each real run copies the current working tree, including uncommitted edits, into a temporary
directory. `.git`, `.dev`, `dist`, `node_modules` and `debug/results` are excluded from the copy.
Existing dependencies are mounted read-only. Checks and build output run in this disposable copy;
the original source, dependencies and deployment are not modified. Dependency auto-installation is
disabled, including during host-side toolchain discovery before entering the sandbox. Corepack
downloads and automatic package-manager pinning are also disabled. Fix reported source issues in
the checkout and rerun the command.

## Open and operate the trial desktop

```sh
pnpm sandbox
```

A nested Hyprland window opens with the minimal Lua configuration in
`scripts/sandbox/hyprland.lua` and its own `rystal-shell-test` instance. The configuration is checked
with `Hyprland --verify-config` before starting the compositor.
Click inside that window before using these shortcuts:

| Shortcut   | Action                                |
| ---------- | ------------------------------------- |
| Ctrl+Alt+L | Toggle application launcher           |
| Ctrl+Alt+C | Toggle control center                 |
| Ctrl+Alt+N | Toggle notification and weather panel |
| Ctrl+Alt+W | Toggle wallpaper selector             |
| Ctrl+Alt+P | Toggle power menu                     |
| Ctrl+Alt+T | Send a private trial notification     |
| Ctrl+Alt+Q | Exit the trial desktop                |

The existing panels can also be operated with the mouse. The run uses a fresh configuration
template each time. Host configuration, wallpaper files, application history and credentials are
not loaded. The two images in `test/fixtures/sandbox/` supply a blue striped wallpaper and a square
profile icon. Each UI run copies them into its private home, starts its own wallpaper daemon and
applies the wallpaper through the bundled theme switcher. This also populates the wallpaper selector
and generates theme colors and the launcher background. Wallpaper selection and theme-mode changes
operate on this private daemon and private files. Replace the fixture PNGs and restart to change the
trial images. The checkout is a snapshot: restart the trial to pick
up further edits. Closing the nested window or pressing Ctrl+C in the launching terminal ends the
run and discards its home, runtime files and source copy.

## Automated UI and memory trial

```sh
pnpm sandbox:smoke
```

This builds and starts the same private desktop, opens and closes the launcher, control center,
notification/weather panel, wallpaper selector and power menu through AGS IPC, sends and clears a
notification on the private bus, runs three launcher memory cycles and two wallpaper/theme cycles,
records memory samples, then
exits. An IPC error, JavaScript exception or startup failure
returns a nonzero status. Opening and closing requests and notification clearing check both the
CLI exit status and the IPC response, including requests within the memory scenarios. Gnim
child-rendering errors and cleanup/onMount registration failures logged through `console.error`
also fail the trial; unavailable-service diagnostics remain expected. Logs are saved under
`.dev/sandbox/smoke.<unique-id>/`:

- `run.log`: build output and trial results.
- `hyprland.log`: nested compositor diagnostics.
- `hyprland-config.log`: Lua configuration validation before startup.
- `shell.log`: GTK/GJS diagnostics, including unavailable-service errors.
- `wallpaper.log` and `theme.log`: private wallpaper daemon and initial theme generation diagnostics.
- `memory.csv`: baseline, open-panel and settled PSS/RSS for the exact GJS PID.
- `launcher-memory/memory.csv`: baseline and open/closed samples across three launcher cycles.
- `wallpaper-memory/memory.csv`: baseline, opened, theme-changed and closed samples across two cycles.
- `toggle-*.png`: nested desktop screenshots when `grim` is available. The Lua configuration permits
  `/usr/bin/grim` to capture this private compositor. A capture failure or 10-second timeout fails
  the smoke test.

Compare baseline, the highest open-panel sample and settled PSS across runs. These samples help
spot regressions; a short smoke test alone does not prove the absence of leaks. The longer memory
scenario script can print its plan without accessing images or requiring desktop tools:

```sh
./debug/run-memory-scenarios.sh --scenario all --iterations 10 --dry-run
```

It refuses mutations outside the sandbox unless `--allow-live-session` is supplied explicitly.
That option permits real notification, theme, audio and AGS lifecycle operations on the active
desktop; it is not an isolated trial. The collector accepts `--pid PID` to avoid selecting another
running shell, or uses `RYSTAL_SHELL_PID` when supplied by the sandbox.

## Isolation and limits

Bubblewrap creates private PID, network and IPC namespaces with a fresh `/proc`, `/dev`, `/tmp`,
home and XDG runtime directory. Environment variables are cleared, a private session D-Bus is
started, and the system bus is unavailable. System files and the selected toolchain are read-only.
The run does not use `direnv`, deploy files, restart the normal shell, or load user Hyprland startup
commands. Only the run's temporary source directory and log directory are writable host mounts.

UI runs share the parent's Wayland socket for displaying the nested window and GPU render nodes
for drawing. They consume CPU/GPU/memory and can briefly change keyboard focus. This is a desktop
trial environment, not a virtual machine or a security boundary for hostile code. Parent shortcut
bindings may intercept a trial shortcut; mouse controls remain available.

Real Wi-Fi, Bluetooth, brightness, power management, host audio, media players and online weather
are unavailable. Error/empty states are expected where the UI depends on those services. Test real
hardware behavior and successful power actions in a dedicated VM or separate machine. The sandbox
tests the real widgets and IPC against an isolated compositor, without simulating those services.

Generated `.dev/` logs are ignored by Git. Logs persist for review, while temporary source/home
files are cleaned up on normal exit or interrupt. An uncatchable termination such as SIGKILL can
leave a `rystal-sandbox.*` temporary source directory in the system temporary directory.

[Back to development](development.md)
