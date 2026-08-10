import { Gdk, Gtk } from 'ags/gtk4';
import { exec, execAsync } from 'ags/process';

import GLib from 'gi://GLib';

import style from '../style.scss';

import { reloadLauncherBackground } from '../services/launcherBackground';
import { forceRedrawBar } from '../widget/bar';
import { ryprlandRuntimeDir } from './paths';

let globalCssProvider: Gtk.CssProvider | null = null;
let lastCompiledCss: string | null = null;
const configDir = `${GLib.get_user_config_dir()}/ags`;
const scssPath = `${configDir}/style.scss`;
const runtimeDir = `${ryprlandRuntimeDir}/rystal-shell`;
const cssPath = `${runtimeDir}/style.css`;

function ensureRuntimeDir() {
  GLib.mkdir_with_parents(runtimeDir, 0o700);
}

function readCompiledCss() {
  const [success, bytes] = GLib.file_get_contents(cssPath);
  if (!success || !bytes) {
    throw new Error(`Cannot read compiled CSS: ${cssPath}`);
  }
  return new TextDecoder().decode(bytes);
}

function reloadCss(cssInput: string) {
  const display = Gdk.Display.get_default();
  if (!display) {
    throw new Error('Cannot reload CSS without a default display');
  }

  if (globalCssProvider) {
    Gtk.StyleContext.remove_provider_for_display(display, globalCssProvider);
    globalCssProvider.run_dispose();
    globalCssProvider = null;
  }

  const nextProvider = new Gtk.CssProvider();
  if (GLib.file_test(cssInput, GLib.FileTest.EXISTS)) {
    nextProvider.load_from_path(cssInput);
  } else {
    nextProvider.load_from_string(cssInput);
  }

  Gtk.StyleContext.add_provider_for_display(
    display,
    nextProvider,
    Gtk.STYLE_PROVIDER_PRIORITY_USER,
  );

  globalCssProvider = nextProvider;

  reloadLauncherBackground();
  forceRedrawBar();
}

export function compileAndReloadCss(): Promise<void> {
  ensureRuntimeDir();
  return execAsync(`sass ${scssPath} ${cssPath}`)
    .then(() => {
      const css = readCompiledCss();
      if (css === lastCompiledCss) return;

      reloadCss(css);
      lastCompiledCss = css;
    })
    .catch((err) => {
      console.error(`Error compiling SCSS: ${err}`);
      throw err;
    });
}

export function initCss() {
  try {
    ensureRuntimeDir();
    exec(['sass', scssPath, cssPath]);
    const css = readCompiledCss();
    reloadCss(css);
    lastCompiledCss = css;
  } catch (error) {
    console.error(`Error compiling initial SCSS, using bundled CSS: ${error}`);
    reloadCss(style);
    lastCompiledCss = style;
  }
}
