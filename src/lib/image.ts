import Gdk from 'gi://Gdk';
import GdkPixbuf from 'gi://GdkPixbuf?version=2.0';
import Gio from 'gi://Gio';

const textureCache = new Map<string, Gdk.Texture>();

export function loadTextureFromUri(
  uri: string,
  maxWidth: number,
  maxHeight: number,
  cache = false,
) {
  const cacheKey = `${uri}:${maxWidth}x${maxHeight}`;
  if (cache) {
    const cached = textureCache.get(cacheKey);
    if (cached) return cached;
  }

  const path = Gio.File.new_for_uri(uri).get_path();
  if (!path) throw new Error(`Image URI is not a local file: ${uri}`);

  const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, maxWidth, maxHeight, true);
  const texture = Gdk.Texture.new_for_pixbuf(pixbuf);
  if (cache) textureCache.set(cacheKey, texture);
  return texture;
}
