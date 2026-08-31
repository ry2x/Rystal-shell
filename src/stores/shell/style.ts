import {Gdk, Gtk} from 'ags/gtk4';
import {exec, execAsync} from 'ags/process';

import GLib from 'gi://GLib';

import {appConfig} from '@/lib/config';
import {rystalShellConfigDir, rystalShellDataDir, rystalShellRuntimeDir} from '@/lib/paths';
import {reloadBarColors} from '@/stores/shell/barBackground';

let cssProvider: Gtk.CssProvider | null = null;
let lastCompiledCssHash: string | null = null;

const styleEntry = `${rystalShellDataDir}/styles/style.scss`;
const defaultThemeDir = `${rystalShellDataDir}/styles/default`;
const defaultCssPath = `${rystalShellDataDir}/styles/default.css`;
const runtimeDir = rystalShellRuntimeDir;
const cssPath = `${runtimeDir}/style.css`;
const currentScalePath = `${runtimeDir}/_current-scale.scss`;

interface CompiledCss {
  path: string;
  hash: string;
}

function ensureRuntimeDir() {
  GLib.mkdir_with_parents(runtimeDir, 0o700);
}

function writeCurrentScale() {
  const temporaryPath = `${currentScalePath}.tmp`;
  const contents = `// Generated file. Do not edit.\n$app-scale: ${appConfig.ui.scale};\n`;
  GLib.file_set_contents(temporaryPath, contents);
  if (GLib.rename(temporaryPath, currentScalePath) !== 0) {
    throw new Error(`Cannot replace generated scale file: ${currentScalePath}`);
  }
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

function removeFile(path: string) {
  if (GLib.file_test(path, GLib.FileTest.EXISTS)) GLib.unlink(path);
}

function promoteCss(compiledCss: CompiledCss) {
  if (GLib.rename(compiledCss.path, cssPath) !== 0) {
    removeFile(compiledCss.path);
    throw new Error(`Cannot replace compiled CSS: ${cssPath}`);
  }
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
    Gtk.STYLE_PROVIDER_PRIORITY_USER
  );

  if (cssProvider) {
    Gtk.StyleContext.remove_provider_for_display(display, cssProvider);
    cssProvider.run_dispose();
  }
  cssProvider = nextProvider;
  reloadBarColors();
}

function sassCommand(outputPath: string, useConfiguredTheme: boolean) {
  const command = ['sass', '--style=expanded', '--no-source-map', '--load-path', runtimeDir];
  if (useConfiguredTheme) command.push('--load-path', rystalShellConfigDir);
  command.push('--load-path', defaultThemeDir, styleEntry, outputPath);
  return command;
}

function temporaryCssPath() {
  return `${cssPath}.tmp-${GLib.uuid_string_random()}`;
}

function compileCss(useConfiguredTheme: boolean): CompiledCss {
  const path = temporaryCssPath();
  try {
    exec(sassCommand(path, useConfiguredTheme));
    return {path, hash: getCssHash(path)};
  } catch (error) {
    removeFile(path);
    throw error;
  }
}

function compileCssAsync(useConfiguredTheme: boolean): Promise<CompiledCss> {
  const path = temporaryCssPath();
  return execAsync(sassCommand(path, useConfiguredTheme))
    .then(() => ({path, hash: getCssHash(path)}))
    .catch(error => {
      removeFile(path);
      throw error;
    });
}

export function compileAndReloadCss(): Promise<boolean> {
  ensureRuntimeDir();
  writeCurrentScale();
  return compileCssAsync(true)
    .then(compiledCss => {
      if (compiledCss.hash === lastCompiledCssHash) {
        removeFile(compiledCss.path);
        return false;
      }

      promoteCss(compiledCss);
      reloadCss(cssPath);
      lastCompiledCssHash = compiledCss.hash;
      return true;
    })
    .catch(error => {
      console.error(`Error compiling CSS; keeping the active stylesheet: ${error}`);
      throw error;
    });
}

export function initCss() {
  ensureRuntimeDir();
  writeCurrentScale();
  let compiledCss: CompiledCss;

  try {
    compiledCss = compileCss(true);
  } catch (configuredThemeError) {
    console.error(`Error compiling configured SCSS: ${configuredThemeError}`);
    try {
      compiledCss = compileCss(false);
      console.warn(`Using the default theme at UI scale ${appConfig.ui.scale}`);
    } catch (defaultThemeError) {
      console.error(`Error compiling default SCSS: ${defaultThemeError}`);
      if (appConfig.ui.scale !== 1) {
        throw new Error(
          `Cannot initialize CSS at requested UI scale ${appConfig.ui.scale}: ${defaultThemeError}`,
          {cause: defaultThemeError}
        );
      }
      reloadCss(defaultCssPath);
      lastCompiledCssHash = getCssHash(defaultCssPath);
      return;
    }
  }

  promoteCss(compiledCss);
  reloadCss(cssPath);
  lastCompiledCssHash = compiledCss.hash;
}
