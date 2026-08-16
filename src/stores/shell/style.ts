import { Gdk, Gtk } from 'ags/gtk4';
import { exec, execAsync } from 'ags/process';

import GLib from 'gi://GLib';

import { ryprlandRuntimeDir, rystalShellConfigDir, rystalShellDataDir } from '../../lib/paths';
import { reloadBarColors } from './barBackground';

let cssProvider: Gtk.CssProvider | null = null;
let lastCompiledCssHash: string | null = null;

const styleEntry = `${rystalShellDataDir}/styles/style.scss`;
const defaultThemeDir = `${rystalShellDataDir}/styles/default`;
const defaultCssPath = `${rystalShellDataDir}/styles/default.css`;
const runtimeDir = `${ryprlandRuntimeDir}/rystal-shell`;
const cssPath = `${runtimeDir}/style.css`;

function ensureRuntimeDir() {
  GLib.mkdir_with_parents(runtimeDir, 0o700);
}

function getCssHash(path: string): string {
  const [success, bytes] = GLib.file_get_contents(path);
  if (!success || !bytes) {
    throw new Error(`Cannot read CSS: ${path}`);
  }
  const hash = GLib.compute_checksum_for_data(GLib.ChecksumType.MD5, bytes);
  if (!hash) throw new Error(`Cannot hash CSS: ${path}`);
  return hash;
}

function reloadCss(path: string) {
  const display = Gdk.Display.get_default();
  if (!display) {
    throw new Error('Cannot reload CSS without a default display');
  }

  if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
    throw new Error(`CSS file not found: ${path}`);
  }

  const nextProvider = new Gtk.CssProvider();
  nextProvider.load_from_path(path);

  Gtk.StyleContext.add_provider_for_display(
    display,
    nextProvider,
    Gtk.STYLE_PROVIDER_PRIORITY_USER,
  );

  if (cssProvider) {
    Gtk.StyleContext.remove_provider_for_display(display, cssProvider);
    cssProvider.run_dispose();
  }
  cssProvider = nextProvider;
  reloadBarColors();
}

function sassCommand() {
  return [
    'sass',
    '--style=expanded',
    '--no-source-map',
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
      const currentHash = getCssHash(cssPath);
      if (currentHash === lastCompiledCssHash) return false;

      reloadCss(cssPath);
      lastCompiledCssHash = currentHash;
      return true;
    })
    .catch((error) => {
      console.error(`Error compiling CSS; keeping the active stylesheet: ${error}`);
      throw error;
    });
}

export function initCss() {
  ensureRuntimeDir();
  try {
    exec(sassCommand());
    reloadCss(cssPath);
    lastCompiledCssHash = getCssHash(cssPath);
  } catch (error) {
    console.error(`Error compiling initial SCSS: ${error}`);
    const fallbackPath = GLib.file_test(cssPath, GLib.FileTest.EXISTS) ? cssPath : defaultCssPath;
    reloadCss(fallbackPath);
    lastCompiledCssHash = getCssHash(fallbackPath);
  }
}
