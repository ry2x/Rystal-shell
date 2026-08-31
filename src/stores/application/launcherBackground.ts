import {Gdk, Gtk} from 'ags/gtk4';

import GLib from 'gi://GLib';

import {loadTextureFromUri} from '@/lib/image';
import {rystalShellConfigDir, rystalShellDataDir} from '@/lib/paths';
import {type UiScaleContext} from '@/lib/uiScale';

const configuredBackgroundPath = `${rystalShellConfigDir}/assets/launcher_bg.png`;
const defaultBackgroundPath = `${rystalShellDataDir}/assets/icon.png`;
const pictures = new Map<Gtk.Picture, UiScaleContext>();
const textures = new Map<number, Gdk.Texture>();
const dirtyScales = new Set<number>();

function loadBackground(uiScale: UiScaleContext) {
  try {
    const path = GLib.file_test(configuredBackgroundPath, GLib.FileTest.EXISTS)
      ? configuredBackgroundPath
      : defaultBackgroundPath;
    return loadTextureFromUri(`file://${path}`, uiScale.size(500), uiScale.size(500));
  } catch (error) {
    console.error('Failed to load launcher background:', error);
    return null;
  }
}

export function registerLauncherBackground(picture: Gtk.Picture, uiScale: UiScaleContext) {
  pictures.set(picture, uiScale);
  const texture = textures.get(uiScale.scale);
  if (texture) picture.set_paintable(texture);
  else dirtyScales.add(uiScale.scale);

  return () => pictures.delete(picture);
}

function replaceBackground(uiScale: UiScaleContext) {
  const texture = loadBackground(uiScale);
  if (texture) textures.set(uiScale.scale, texture);
  else textures.delete(uiScale.scale);
  for (const [picture, pictureScale] of pictures) {
    if (pictureScale.scale !== uiScale.scale) continue;
    picture.set_paintable(texture ?? (null as unknown as Gdk.Paintable));
  }
  return texture !== null;
}

export function reloadLauncherBackground() {
  const visibleScales = new Map<number, UiScaleContext>();
  for (const [picture, uiScale] of pictures) {
    if (picture.get_mapped()) visibleScales.set(uiScale.scale, uiScale);
  }
  textures.clear();
  for (const uiScale of visibleScales.values()) {
    if (replaceBackground(uiScale)) dirtyScales.delete(uiScale.scale);
    else dirtyScales.add(uiScale.scale);
  }
  for (const uiScale of pictures.values()) {
    if (!visibleScales.has(uiScale.scale)) dirtyScales.add(uiScale.scale);
  }
}

export function ensureLauncherBackground(uiScale: UiScaleContext) {
  if (!dirtyScales.has(uiScale.scale) && textures.has(uiScale.scale)) return;

  if (replaceBackground(uiScale)) dirtyScales.delete(uiScale.scale);
  else dirtyScales.add(uiScale.scale);
}
