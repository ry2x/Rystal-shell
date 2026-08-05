import Mpris from 'gi://AstalMpris';
import GLib from 'gi://GLib?version=2.0';
import Soup from 'gi://Soup?version=3.0';

const thumbnailSession = new Soup.Session();
const thumbnailDownloads = new Map<string, Promise<string | null>>();

async function downloadThumbnailUrl(url: string, localPath: string) {
  try {
    const message = Soup.Message.new('GET', url);
    const bytes = await thumbnailSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    if (message.status_code < 200 || message.status_code >= 300) return false;

    const data = bytes.get_data();
    if (data && data.length > 0) {
      GLib.file_set_contents(localPath, data);
      return true;
    }
  } catch (error) {
    console.error(`Failed to download YouTube thumbnail from ${url}:`, error);
  }

  return false;
}

async function downloadThumbnail(id: string, localPath: string) {
  const maxResolutionUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  if (await downloadThumbnailUrl(maxResolutionUrl, localPath)) return `file://${localPath}`;

  const fallbackUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  if (await downloadThumbnailUrl(fallbackUrl, localPath)) return `file://${localPath}`;

  return null;
}

export async function fetchYouTubeThumbnail(player: Mpris.Player): Promise<string | null> {
  const busName = player.bus_name;
  if (!busName) return null;

  let url = '';
  try {
    const metaVariant = player.get_meta('xesam:url');
    if (metaVariant) {
      url = metaVariant.get_string()[0];
    }
  } catch (e) {
    console.error('Failed to get xesam:url:', e);
  }

  if (!url.includes('youtube.com/watch?v=') && !url.includes('youtu.be/')) {
    return null;
  }

  let id = '';
  if (url.includes('youtu.be/')) {
    id = url.split('youtu.be/')[1].split('?')[0];
  } else {
    const match = url.match(/v=([^&]*)/);
    if (match) id = match[1];
  }

  if (!id) return null;

  const cacheDir = `${GLib.get_user_cache_dir()}/ags/media`;
  const localPath = `${cacheDir}/${id}.jpg`;
  if (GLib.file_test(localPath, GLib.FileTest.EXISTS)) return `file://${localPath}`;

  const inFlight = thumbnailDownloads.get(id);
  if (inFlight) return inFlight;

  GLib.mkdir_with_parents(cacheDir, 0o755);
  const download = downloadThumbnail(id, localPath).finally(() => thumbnailDownloads.delete(id));
  thumbnailDownloads.set(id, download);
  return download;
}
