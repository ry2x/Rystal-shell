import Gdk from 'gi://Gdk';
import GdkPixbuf from 'gi://GdkPixbuf?version=2.0';
import Gio from 'gi://Gio';

interface CachedTexture {
  texture: Gdk.Texture;
  references: number;
}

export interface SharedTexture {
  texture: Gdk.Texture;
  release: () => void;
}

const textures = new Map<string, CachedTexture>();
const CACHE_FILE_ATTRIBUTES = 'standard::size,time::modified,time::modified-usec';

function getTextureKey(file: Gio.File, uri: string, maxWidth: number, maxHeight: number) {
  const info = file.query_info(CACHE_FILE_ATTRIBUTES, Gio.FileQueryInfoFlags.NONE, null);
  const size = info.get_size();
  const modified = info.get_attribute_uint64('time::modified');
  const modifiedUsec = info.get_attribute_uint32('time::modified-usec');
  return `${uri}:${maxWidth}x${maxHeight}:${size}:${modified}:${modifiedUsec}`;
}

export function acquireNotificationTexture(
  uri: string,
  maxWidth: number,
  maxHeight: number
): SharedTexture {
  const file = Gio.File.new_for_uri(uri);
  const path = file.get_path();
  if (!path) throw new Error(`Image URI is not a local file: ${uri}`);

  const key = getTextureKey(file, uri, maxWidth, maxHeight);
  let cached = textures.get(key);

  if (!cached) {
    const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, maxWidth, maxHeight, true);
    cached = {texture: Gdk.Texture.new_for_pixbuf(pixbuf), references: 0};
    textures.set(key, cached);
  }

  cached.references += 1;
  let released = false;

  return {
    texture: cached.texture,
    release: () => {
      if (released) return;
      released = true;

      const current = textures.get(key);
      if (!current) return;
      current.references -= 1;
      if (current.references === 0) textures.delete(key);
    },
  };
}
