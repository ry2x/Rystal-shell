import {Gdk, Gtk} from 'ags/gtk4';

import GLib from 'gi://GLib';

import {loadTextureFromUri} from '@/lib/image';
import {rystalShellConfigDir, rystalShellDataDir} from '@/lib/paths';
import {scaleUiSize} from '@/lib/uiScale';

const pictures = new Set<Gtk.Picture>();
let texture: Gdk.Texture | null = null;
let isImageDirty = true;

function loadImage() {
  const imagePath = `${rystalShellConfigDir}/assets/launcher_bg.png`;
  const defaultImagePath = `${rystalShellDataDir}/assets/icon.png`;

  try {
    const path = GLib.file_test(imagePath, GLib.FileTest.EXISTS) ? imagePath : defaultImagePath;
    return loadTextureFromUri(`file://${path}`, scaleUiSize(500), scaleUiSize(500));
  } catch (error) {
    console.error('Failed to load launcher background image:', error);
    return null;
  }
}

export function registerLauncherImage(picture: Gtk.Picture) {
  pictures.add(picture);
  if (texture) picture.set_paintable(texture);

  return () => pictures.delete(picture);
}

function replaceLauncherImage() {
  texture = loadImage();
  for (const picture of pictures) {
    picture.set_paintable(texture ?? (null as unknown as Gdk.Paintable));
  }
  return texture !== null;
}

export function reloadLauncherImage() {
  const hasVisibleLauncher = [...pictures].some(picture => picture.get_mapped());
  if (!hasVisibleLauncher) {
    isImageDirty = true;
    return;
  }

  isImageDirty = !replaceLauncherImage();
}

export function ensureLauncherImage() {
  if (!isImageDirty && texture) return;

  isImageDirty = !replaceLauncherImage();
}
