-- Standalone configuration: never source the user's compositor configuration.
hl.monitor({
  output = "",
  mode = "1280x720@60",
  position = "auto",
  scale = 1,
})

hl.config({
  ecosystem = {
    enforce_permissions = true,
  },
  xwayland = {
    enabled = false,
  },
  misc = {
    disable_hyprland_logo = true,
    disable_splash_rendering = true,
  },
  debug = {
    disable_logs = false,
    enable_stdout_logs = true,
  },
})

-- Allow smoke-test screenshots only inside this disposable compositor.
hl.permission("/usr/bin/grim", "screencopy", "allow")

hl.bind("CTRL + ALT + Q", hl.dsp.exit())
hl.bind("CTRL + ALT + L", hl.dsp.exec_cmd("ags request -i rystal-shell-test toggle-launcher"))
hl.bind("CTRL + ALT + C", hl.dsp.exec_cmd("ags request -i rystal-shell-test toggle-cc"))
hl.bind("CTRL + ALT + N", hl.dsp.exec_cmd("ags request -i rystal-shell-test toggle-notif"))
hl.bind("CTRL + ALT + W", hl.dsp.exec_cmd("ags request -i rystal-shell-test toggle-wallpaper"))
hl.bind("CTRL + ALT + P", hl.dsp.exec_cmd("ags request -i rystal-shell-test toggle-power-menu"))
hl.bind("CTRL + ALT + T", hl.dsp.exec_cmd(
  'notify-send -a Rystal-Sandbox "Sandbox notification" "Private session bus test"'
))
