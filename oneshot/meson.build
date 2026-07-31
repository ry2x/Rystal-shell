project(
  'rypr-oneshot',
  'vala',
  version: '0.1.0',
  meson_version: '>=1.0.0',
)

gnome = import('gnome')

oneshot_deps = [
  dependency('gtk4'),
  dependency('gtk4-layer-shell-0'),
  dependency('astal-4-4.0'),
  dependency('astal-apps-0.1'),
  dependency('astal-hyprland-0.1'),
  dependency('astal-io-0.1'),
  dependency('gee-0.8'),
  dependency('gio-unix-2.0'),
  dependency('json-glib-1.0'),
]

subdir('app-launcher')
