import {type Process, subprocess} from 'ags/process';

import Mpris from 'gi://AstalMpris';
import GLib from 'gi://GLib?version=2.0';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';

import {rystalShellCacheDir} from '@/lib/paths';
import {scaleUiSize} from '@/lib/uiScale';

const DOWNLOAD_TIMEOUT_SECONDS = 10;
const THUMBNAIL_SIZE = scaleUiSize(160);
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const thumbnailSession = new Soup.Session({timeout: DOWNLOAD_TIMEOUT_SECONDS});

function getYouTubeVideoId(url: string) {
  try {
    const uri = GLib.Uri.parse(url, GLib.UriFlags.NONE);
    const host = uri.get_host()?.toLowerCase();
    const path = uri.get_path();

    if (host === 'youtu.be') {
      const id = path.replace(/^\//, '').split('/')[0];
      return YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host ?? '')) return null;
    if (path !== '/watch') return null;

    const query = uri.get_query() ?? '';
    const value = query
      .split('&')
      .map(part => part.split('=', 2))
      .find(([key]) => key === 'v')?.[1];
    if (!value) return null;

    const id = decodeURIComponent(value);
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

function sendAndRead(message: Soup.Message, cancellable: Gio.Cancellable): Promise<GLib.Bytes> {
  return new Promise((resolve, reject) => {
    thumbnailSession.send_and_read_async(
      message,
      GLib.PRIORITY_DEFAULT,
      cancellable,
      (_session, result) => {
        try {
          resolve(thumbnailSession.send_and_read_finish(result));
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

async function downloadThumbnailUrl(url: string, localPath: string, cancellable: Gio.Cancellable) {
  try {
    const message = Soup.Message.new('GET', url);
    const bytes = await sendAndRead(message, cancellable);
    if (cancellable.is_cancelled()) return false;
    if (message.status_code < 200 || message.status_code >= 300) return false;

    const data = bytes.get_data();
    if (data && data.length > 0) {
      GLib.file_set_contents(localPath, data);
      return true;
    }
  } catch (error) {
    if (cancellable.is_cancelled()) return false;
    console.error(`Failed to download YouTube thumbnail from ${url}:`, error);
  }

  return false;
}

async function downloadThumbnail(id: string, localPath: string, cancellable: Gio.Cancellable) {
  // The card renders at a scaled 80x80 (scaled 160x160 decode limit), so downloading the
  // 1280x720 max-resolution image only increases JPEG/Pixbuf working memory.
  const mediumQualityUrl = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  if (await downloadThumbnailUrl(mediumQualityUrl, localPath, cancellable)) {
    return true;
  }
  if (cancellable.is_cancelled()) return null;

  const fallbackUrl = `https://img.youtube.com/vi/${id}/default.jpg`;
  if (await downloadThumbnailUrl(fallbackUrl, localPath, cancellable)) {
    return true;
  }

  return null;
}

function deleteDownloadedThumbnail(path: string) {
  try {
    Gio.File.new_for_path(path).delete(null);
  } catch {
    // The process may not have created the file, or it may already have been moved.
  }
}

function waitForProcess(process: Process) {
  return new Promise<{code: number; signaled: boolean}>(resolve => {
    let exitHook: number | null = null;
    exitHook = process.connect('exit', (_, code, signaled) => {
      if (exitHook !== null) process.disconnect(exitHook);
      resolve({code, signaled});
    });
  });
}

async function convertThumbnail(
  sourcePath: string,
  outputPath: string,
  jobCancellable: Gio.Cancellable
) {
  const errors: string[] = [];
  const process = subprocess({
    cmd: [
      'magick',
      sourcePath,
      '-strip',
      '-thumbnail',
      `${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}^`,
      '-gravity',
      'center',
      '-extent',
      `${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}`,
      '-quality',
      '70',
      '-define',
      'webp:method=2',
      `webp:${outputPath}`,
    ],
    err: line => errors.push(line),
  });

  const cancellationHook = jobCancellable.connect(() => {
    try {
      process.kill();
    } catch {
      // The process may have exited immediately before cancellation.
    }
  });

  try {
    const {code, signaled} = await waitForProcess(process);
    if (jobCancellable.is_cancelled()) return false;
    if (signaled || code !== 0) {
      throw new Error(errors.join('\n') || `magick exited with status ${code}`);
    }
    return true;
  } finally {
    jobCancellable.disconnect(cancellationHook);
  }
}

export async function fetchYouTubeThumbnail(
  player: Mpris.Player,
  cancellable: Gio.Cancellable
): Promise<string | null> {
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

  const id = getYouTubeVideoId(url);
  if (!id) return null;

  const cacheDir = `${rystalShellCacheDir}/media`;
  const localPath = `${cacheDir}/${id}-${THUMBNAIL_SIZE}.webp`;
  if (GLib.file_test(localPath, GLib.FileTest.EXISTS)) return `file://${localPath}`;

  GLib.mkdir_with_parents(cacheDir, 0o755);
  const temporarySourcePath = `${localPath}.source-${GLib.uuid_string_random()}.jpg`;
  const temporaryOutputPath = `${localPath}.tmp-${GLib.uuid_string_random()}`;

  try {
    if (!(await downloadThumbnail(id, temporarySourcePath, cancellable))) return null;
    if (cancellable.is_cancelled()) return null;
    if (!(await convertThumbnail(temporarySourcePath, temporaryOutputPath, cancellable)))
      return null;

    Gio.File.new_for_path(temporaryOutputPath).move(
      Gio.File.new_for_path(localPath),
      Gio.FileCopyFlags.OVERWRITE,
      cancellable,
      null
    );
    return `file://${localPath}`;
  } catch (error) {
    if (!cancellable.is_cancelled()) {
      console.error(`Failed to generate YouTube thumbnail for ${id}:`, error);
    }
    return null;
  } finally {
    deleteDownloadedThumbnail(temporarySourcePath);
  }
}
