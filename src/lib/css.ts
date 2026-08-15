import { Gdk, Gtk } from 'ags/gtk4';
import { exec, execAsync } from 'ags/process';

import GLib from 'gi://GLib';

import { forceRedrawBar } from '../widget/bar';
import { ryprlandRuntimeDir, rystalShellConfigDir, rystalShellDataDir } from './paths';

let globalCssProvider: Gtk.CssProvider | null = null;
let lastCompiledCss: string | null = null;
const styleEntry = `${rystalShellDataDir}/styles/style.scss`;
const defaultThemeDir = `${rystalShellDataDir}/styles/default`;
const defaultCssPath = `${rystalShellDataDir}/styles/default.css`;
const runtimeDir = `${ryprlandRuntimeDir}/rystal-shell`;
const cssPath = `${runtimeDir}/style.css`;

function ensureRuntimeDir() {
  GLib.mkdir_with_parents(runtimeDir, 0o700);
}

function readCss(path: string) {
  const [success, bytes] = GLib.file_get_contents(path);
  if (!success || !bytes) {
    throw new Error(`Cannot read CSS: ${path}`);
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
  forceRedrawBar();
}

function sassCommand() {
  return [
    'sass',
    '--style=compressed',
    '--load-path',
    rystalShellConfigDir,
    '--load-path',
    defaultThemeDir,
    styleEntry,
    cssPath,
  ];
}

export function compileAndReloadCss(): Promise<boolean> {
  ensureRuntimeDir();
  return execAsync(sassCommand())
    .then(() => {
      const css = readCss(cssPath);
      if (css === lastCompiledCss) return false;

      reloadCss(css);
      lastCompiledCss = css;
      return true;
    })
    .catch((err) => {
      console.error(`Error compiling CSS; keeping the active stylesheet: ${err}`);
      throw err;
    });
}

export function initCss() {
  ensureRuntimeDir();
  try {
    exec(sassCommand());
    const css = readCss(cssPath);
    reloadCss(css);
    lastCompiledCss = css;
  } catch (error) {
    console.error(`Error compiling initial SCSS: ${error}`);
    const fallbackPath = GLib.file_test(cssPath, GLib.FileTest.EXISTS) ? cssPath : defaultCssPath;
    const css = readCss(fallbackPath);
    reloadCss(css);
    lastCompiledCss = css;
  }
}
