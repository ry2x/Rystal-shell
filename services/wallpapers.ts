import { createState } from 'ags';
import { execAsync } from 'ags/process';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export type Wallpaper = {
  path: string;
  relativePath: string;
  searchText: string;
  thumbnailPath: string;
  size: number;
  modified: number;
};

const THUMBNAIL_WIDTH = 384;
const THUMBNAIL_HEIGHT = 252;
const THUMBNAIL_VERSION = `v7-${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`;
const MAX_THUMBNAIL_WORKERS = 4;
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const thumbnailSubscribers = new Set<(path: string, thumbnailPath: string) => void>();
const textEncoder = new TextEncoder();

const configuredRoot = GLib.getenv('RYPRLAND_WALLPAPER_DIR');
export const wallpaperRoot = GLib.canonicalize_filename(
  configuredRoot || `${GLib.get_home_dir()}/Pictures/Wallpapers`,
  GLib.get_home_dir(),
);

const cacheRoot = `${GLib.get_user_cache_dir()}/wallpaper-selector`;

export const [wallpapers, setWallpapers] = createState<Wallpaper[]>([]);
export const [wallpapersLoading, setWallpapersLoading] = createState(false);
export const [wallpaperApplying, setWallpaperApplying] = createState(false);
export const [wallpaperError, setWallpaperError] = createState('');

type ThumbnailJob = {
  wallpaper: Wallpaper;
  generation: number;
  priority: number;
};

let generation = 0;
let activeWorkers = 0;
let thumbnailQueue: ThumbnailJob[] = [];
const queuedThumbnails = new Map<string, ThumbnailJob>();

function queryInfo(
  file: Gio.File,
  attributes: string,
  flags: Gio.FileQueryInfoFlags,
  cancellable: Gio.Cancellable | null,
) {
  return new Promise<Gio.FileInfo>((resolve, reject) => {
    file.query_info_async(
      attributes,
      flags,
      GLib.PRIORITY_DEFAULT,
      cancellable,
      (source, result) => {
        try {
          resolve(source!.query_info_finish(result));
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

function enumerateChildren(file: Gio.File, attributes: string, cancellable: Gio.Cancellable) {
  return new Promise<Gio.FileEnumerator>((resolve, reject) => {
    file.enumerate_children_async(
      attributes,
      Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
      GLib.PRIORITY_DEFAULT,
      cancellable,
      (source, result) => {
        try {
          resolve(source!.enumerate_children_finish(result));
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

function nextFiles(enumerator: Gio.FileEnumerator, cancellable: Gio.Cancellable) {
  return new Promise<Gio.FileInfo[]>((resolve, reject) => {
    enumerator.next_files_async(64, GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
      try {
        resolve(source!.next_files_finish(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function closeEnumerator(enumerator: Gio.FileEnumerator) {
  return new Promise<void>((resolve) => {
    enumerator.close_async(GLib.PRIORITY_DEFAULT, null, (source, result) => {
      try {
        source!.close_finish(result);
      } catch {
        // Closing an already cancelled enumerator is harmless.
      }
      resolve();
    });
  });
}

function isSupported(name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.has(extension);
}

function thumbnailKey(path: string, size: number, modified: number) {
  const payload = textEncoder.encode(`${path}\0${size}:${modified}\0${THUMBNAIL_VERSION}`);
  return GLib.compute_checksum_for_data(GLib.ChecksumType.SHA256, payload);
}

function createWallpaper(path: string, relativePath: string, size: number, modified: number) {
  const cacheKey = thumbnailKey(path, size, modified);
  return {
    path,
    relativePath,
    searchText: relativePath.toLocaleLowerCase(),
    thumbnailPath: `${cacheRoot}/${cacheKey}.png`,
    size,
    modified,
  } satisfies Wallpaper;
}

async function enumerateDirectory(
  directory: Gio.File,
  relativeDirectory: string,
  cancellable: Gio.Cancellable,
  refreshGeneration: number,
  output: Wallpaper[],
): Promise<void> {
  if (refreshGeneration !== generation) return;

  const enumerator = await enumerateChildren(
    directory,
    'standard::name,standard::type,standard::size,time::modified',
    cancellable,
  );

  try {
    // Gio's asynchronous enumerator advances independently of these generation guards.
    // eslint-disable-next-line no-unmodified-loop-condition
    while (refreshGeneration === generation) {
      // Sequential batches keep directory enumeration ordered and bounded.
      // eslint-disable-next-line no-await-in-loop
      const infos = await nextFiles(enumerator, cancellable);
      if (infos.length === 0) break;

      for (const info of infos) {
        const name = info.get_name();
        const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
        const child = directory.get_child(name);

        if (info.get_file_type() === Gio.FileType.DIRECTORY) {
          // Recurse sequentially so one refresh cannot open unbounded enumerators.
          // eslint-disable-next-line no-await-in-loop
          await enumerateDirectory(child, relativePath, cancellable, refreshGeneration, output);
        } else if (info.get_file_type() === Gio.FileType.REGULAR && isSupported(name)) {
          const path = child.get_path();
          if (!path) continue;
          const modified = info.get_modification_date_time()?.to_unix() ?? 0;
          output.push(createWallpaper(path, relativePath, info.get_size(), modified));
        }
      }
    }
  } finally {
    await closeEnumerator(enumerator);
  }
}

function notifyThumbnailReady(path: string, thumbnailPath: string) {
  for (const subscriber of thumbnailSubscribers) subscriber(path, thumbnailPath);
}

async function generateThumbnail(job: ThumbnailJob) {
  const { wallpaper, generation: jobGeneration } = job;
  if (GLib.file_test(wallpaper.thumbnailPath, GLib.FileTest.IS_REGULAR)) {
    if (jobGeneration === generation) notifyThumbnailReady(wallpaper.path, wallpaper.thumbnailPath);
    return;
  }

  GLib.mkdir_with_parents(cacheRoot, 0o755);
  const temporaryPath = `${wallpaper.thumbnailPath}.tmp-${GLib.uuid_string_random()}`;

  try {
    await execAsync([
      'magick',
      `${wallpaper.path}[0]`,
      '-strip',
      '-thumbnail',
      `${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}^`,
      '-gravity',
      'center',
      '-extent',
      `${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`,
      `png:${temporaryPath}`,
    ]);
    Gio.File.new_for_path(temporaryPath).move(
      Gio.File.new_for_path(wallpaper.thumbnailPath),
      Gio.FileCopyFlags.OVERWRITE,
      null,
      null,
    );
    if (jobGeneration === generation) notifyThumbnailReady(wallpaper.path, wallpaper.thumbnailPath);
  } catch (error) {
    console.error(`Failed to generate wallpaper thumbnail for ${wallpaper.path}:`, error);
    try {
      Gio.File.new_for_path(temporaryPath).delete(null);
    } catch {
      // The failed command may not have created a temporary file.
    }
  }
}

function finishThumbnailJob() {
  activeWorkers--;
  pumpThumbnailQueue();
}

function startThumbnailJob(job: ThumbnailJob) {
  activeWorkers++;
  void generateThumbnail(job).finally(finishThumbnailJob);
}

function pumpThumbnailQueue() {
  if (activeWorkers >= MAX_THUMBNAIL_WORKERS) return;
  const job = thumbnailQueue.shift();
  if (!job) return;
  queuedThumbnails.delete(job.wallpaper.path);
  if (job.generation === generation) startThumbnailJob(job);
  pumpThumbnailQueue();
}

export function ensureWallpaperThumbnails(items: Wallpaper[], priority = true) {
  for (const wallpaper of items) {
    if (GLib.file_test(wallpaper.thumbnailPath, GLib.FileTest.IS_REGULAR)) continue;

    const existing = queuedThumbnails.get(wallpaper.path);
    if (existing) {
      if (priority) existing.priority = 1;
      continue;
    }

    const job = { wallpaper, generation, priority: priority ? 1 : 0 };
    thumbnailQueue.push(job);
    queuedThumbnails.set(wallpaper.path, job);
  }
  thumbnailQueue.sort((a, b) => b.priority - a.priority);
  pumpThumbnailQueue();
}

export function subscribeThumbnailReady(subscriber: (path: string, thumbnailPath: string) => void) {
  thumbnailSubscribers.add(subscriber);
  return () => thumbnailSubscribers.delete(subscriber);
}

export async function refreshWallpapers() {
  const refreshGeneration = ++generation;
  thumbnailQueue = [];
  queuedThumbnails.clear();
  setWallpapersLoading(true);
  setWallpaperError('');

  const root = Gio.File.new_for_path(wallpaperRoot);
  const cancellable = new Gio.Cancellable();
  const found: Wallpaper[] = [];

  try {
    const info = await queryInfo(
      root,
      'standard::type',
      Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
      cancellable,
    );
    if (info.get_file_type() !== Gio.FileType.DIRECTORY) throw new Error('Not a directory');

    await enumerateDirectory(root, '', cancellable, refreshGeneration, found);
    if (refreshGeneration !== generation) return;

    found.sort((a, b) =>
      a.relativePath.localeCompare(b.relativePath, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
    setWallpapers(found);
    ensureWallpaperThumbnails(found, false);
  } catch (error) {
    if (refreshGeneration !== generation) return;
    console.error(`Failed to scan wallpaper directory ${wallpaperRoot}:`, error);
    setWallpapers([]);
    setWallpaperError(`Wallpaper directory is unavailable: ${wallpaperRoot}`);
  } finally {
    if (refreshGeneration === generation) setWallpapersLoading(false);
  }
}

export function cancelWallpaperWork() {
  generation++;
  thumbnailQueue = [];
  queuedThumbnails.clear();
  setWallpapersLoading(false);
}

export function clearWallpaperError() {
  setWallpaperError('');
}

export async function applyWallpaper(wallpaper: Wallpaper) {
  if (wallpaperApplying.peek()) return false;
  setWallpaperApplying(true);
  setWallpaperError('');

  try {
    const rootPrefix = wallpaperRoot.endsWith('/') ? wallpaperRoot : `${wallpaperRoot}/`;
    if (!wallpaper.path.startsWith(rootPrefix))
      throw new Error('Wallpaper is outside the configured root');

    const info = await queryInfo(
      Gio.File.new_for_path(wallpaper.path),
      'standard::type',
      Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
      null,
    );
    if (info.get_file_type() !== Gio.FileType.REGULAR)
      throw new Error('Wallpaper no longer exists');

    await execAsync(['theme-switch.sh', 'set', '--', wallpaper.path]);
    return true;
  } catch (error) {
    console.error(`Failed to apply wallpaper ${wallpaper.path}:`, error);
    setWallpaperError(`Failed to apply ${wallpaper.relativePath}`);
    return false;
  } finally {
    setWallpaperApplying(false);
  }
}
