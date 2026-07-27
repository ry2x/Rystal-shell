import { Gdk, Gtk } from 'ags/gtk4';

import GLib from 'gi://GLib';

import { loadTextureFromUri } from '../lib/image';

const BACKGROUND_PATH = `${GLib.get_user_config_dir()}/ags/assets/launcher_bg.png`;
const pictures = new Set<Gtk.Picture>();
let texture: Gdk.Texture | null = null;

function loadBackground() {
  try {
    return loadTextureFromUri(`file://${BACKGROUND_PATH}`, 500, 500);
  } catch (error) {
    console.error('Failed to load launcher background:', error);
    return null;
  }
}

export function registerLauncherBackground(picture: Gtk.Picture) {
  pictures.add(picture);
  texture ??= loadBackground();
  if (texture) picture.set_paintable(texture);

  return () => pictures.delete(picture);
}

export function reloadLauncherBackground() {
  texture = loadBackground();
  for (const picture of pictures) {
    picture.set_paintable(texture ?? (null as unknown as Gdk.Paintable));
  }
}
