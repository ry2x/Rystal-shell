import {Gdk, Gtk} from 'ags/gtk4';
import {exec, execAsync} from 'ags/process';

import GLib from 'gi://GLib';

import {appConfig} from '@/lib/config';
import {rystalShellConfigDir, rystalShellDataDir, rystalShellRuntimeDir} from '@/lib/paths';
import {uiScaleClass} from '@/lib/uiScale';
import {reloadBarColors} from '@/stores/shell/barBackground';

let cssProvider: Gtk.CssProvider | null = null;
let lastCompiledCssHash: string | null = null;

const styleEntry = `${rystalShellDataDir}/styles/style.scss`;
const defaultThemeDir = `${rystalShellDataDir}/styles/default`;
const defaultCssPath = `${rystalShellDataDir}/styles/default.css`;
const runtimeDir = rystalShellRuntimeDir;
const cssPath = `${runtimeDir}/style.css`;
const configuredScalesPath = `${runtimeDir}/_configured-scales.scss`;

interface CompiledCss {
  path: string;
  hash: string;
}

function ensureRuntimeDir() {
  GLib.mkdir_with_parents(runtimeDir, 0o700);
}

function writeConfiguredScales() {
  const temporaryPath = `${configuredScalesPath}.tmp`;
  const scales = new Set([
    appConfig.ui.scale,
    ...Object.values(appConfig.ui.monitors).map(monitor => monitor.scale),
  ]);
  const entries = [...scales]
    .sort((left, right) => left - right)
    .map(scale => `  '${uiScaleClass(scale)}': ${scale},`)
    .join('\n');
  const contents = [
    '// Generated file. Do not edit.',
    '$app-scales: (',
    entries,
    ');',
    `$app-fallback-scale: ${appConfig.ui.scale};`,
    '',
  ].join('\n');
  GLib.file_set_contents(temporaryPath, contents);
  if (GLib.rename(temporaryPath, configuredScalesPath) !== 0) {
    throw new Error(`Cannot replace generated scale file: ${configuredScalesPath}`);
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
  writeConfiguredScales();
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
  writeConfiguredScales();
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
      console.warn('Using the bundled default theme with all supported UI scales');
      reloadCss(defaultCssPath);
      lastCompiledCssHash = getCssHash(defaultCssPath);
      return;
    }
  }

  promoteCss(compiledCss);
  reloadCss(cssPath);
  lastCompiledCssHash = compiledCss.hash;
}
