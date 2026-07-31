blueprint_compiler = find_program('blueprint-compiler')

app_launcher_ui = custom_target(
  'app-launcher-ui',
  input: 'ui/app-launcher.blp',
  output: 'app-launcher.ui',
  command: [blueprint_compiler, 'compile', '@INPUT@'],
  capture: true,
)

resources_xml = configure_file(
  input: 'resources.gresource.xml.in',
  output: 'resources.gresource.xml',
  copy: true,
)

app_launcher_css = configure_file(
  input: 'style.css',
  output: 'style.css',
  copy: true,
)

app_launcher_resources = gnome.compile_resources(
  'app-launcher-resources',
  resources_xml,
  source_dir: meson.current_build_dir(),
  dependencies: [app_launcher_ui, app_launcher_css],
  c_name: 'rypr_oneshot_app_launcher',
)

executable(
  'rypr-app-launcher',
  [
    'src/main.vala',
    'src/theme.vala',
    app_launcher_resources,
  ],
  dependencies: oneshot_deps,
  install: true,
)
