import { createState } from 'ags';
import { execAsync } from 'ags/process';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { ryprlandWallpaperDir } from '../lib/paths';
import {
  cancelWallpaperThumbnailWork,
  ensureWallpaperThumbnails,
  getWallpaperThumbnailPath,
} from './wallpaperThumbnail';

export interface Wallpaper {
  path: string;
  relativePath: string;
  searchText: string;
  thumbnailPath: string;
  size: number;
  modified: number;
}

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const wallpaperRoot = GLib.canonicalize_filename(ryprlandWallpaperDir, GLib.get_home_dir());

const [wallpapersState, setWallpapers] = createState<Wallpaper[]>([]);
const [wallpapersLoadingState, setWallpapersLoading] = createState(false);
const [wallpaperApplyingState, setWallpaperApplying] = createState(false);
const [wallpaperErrorState, setWallpaperError] = createState('');
export const wallpapers = wallpapersState;
export const wallpapersLoading = wallpapersLoadingState;
export const wallpaperApplying = wallpaperApplyingState;
export const wallpaperError = wallpaperErrorState;

let refreshGeneration = 0;
let refreshCancellable: Gio.Cancellable | null = null;

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

function createWallpaper(path: string, relativePath: string, size: number, modified: number) {
  return {
    path,
    relativePath,
    searchText: relativePath.toLocaleLowerCase(),
    thumbnailPath: getWallpaperThumbnailPath(path, size, modified),
    size,
    modified,
  } satisfies Wallpaper;
}

async function enumerateDirectory(
  directory: Gio.File,
  relativeDirectory: string,
  cancellable: Gio.Cancellable,
  generation: number,
  output: Wallpaper[],
): Promise<void> {
  if (generation !== refreshGeneration) return;
  const enumerator = await enumerateChildren(
    directory,
    'standard::name,standard::type,standard::size,time::modified',
    cancellable,
  );

  try {
    // Gio's asynchronous enumerator advances independently of these generation guards.
    // eslint-disable-next-line no-unmodified-loop-condition
    while (generation === refreshGeneration) {
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
          await enumerateDirectory(child, relativePath, cancellable, generation, output);
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

export async function refreshWallpapers() {
  const generation = ++refreshGeneration;
  refreshCancellable?.cancel();
  cancelWallpaperThumbnailWork();
  const cancellable = new Gio.Cancellable();
  refreshCancellable = cancellable;
  setWallpapersLoading(true);
  setWallpaperError('');

  const root = Gio.File.new_for_path(wallpaperRoot);
  const found: Wallpaper[] = [];

  try {
    const info = await queryInfo(
      root,
      'standard::type',
      Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
      cancellable,
    );
    if (info.get_file_type() !== Gio.FileType.DIRECTORY) throw new Error('Not a directory');

    await enumerateDirectory(root, '', cancellable, generation, found);
    if (generation !== refreshGeneration) return;

    found.sort((a, b) =>
      a.relativePath.localeCompare(b.relativePath, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
    setWallpapers(found);
    ensureWallpaperThumbnails(found, false);
  } catch (error) {
    if (generation !== refreshGeneration) return;
    console.error(`Failed to scan wallpaper directory ${wallpaperRoot}:`, error);
    setWallpapers([]);
    setWallpaperError(`Wallpaper directory is unavailable: ${wallpaperRoot}`);
  } finally {
    if (generation === refreshGeneration) {
      refreshCancellable = null;
      setWallpapersLoading(false);
    }
  }
}

export function cancelWallpaperWork() {
  refreshGeneration++;
  refreshCancellable?.cancel();
  refreshCancellable = null;
  cancelWallpaperThumbnailWork();
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
    if (!wallpaper.path.startsWith(rootPrefix)) {
      throw new Error('Wallpaper is outside the configured root');
    }

    const info = await queryInfo(
      Gio.File.new_for_path(wallpaper.path),
      'standard::type',
      Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
      null,
    );
    if (info.get_file_type() !== Gio.FileType.REGULAR) {
      throw new Error('Wallpaper no longer exists');
    }

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
