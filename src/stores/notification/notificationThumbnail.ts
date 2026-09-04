import {type Process, subprocess} from 'ags/process';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {rystalShellCacheDir} from '@/lib/paths';

const THUMBNAIL_VERSION = 'v1';
const MAX_THUMBNAIL_WORKERS = 2;
const MAX_CACHE_FILES = 128;
const CACHE_FILE_ATTRIBUTES = 'standard::name,time::modified';

const cacheRoot = `${rystalShellCacheDir}/notifications/thumbnails`;
const textEncoder = new TextEncoder();

type ThumbnailSubscriber = (path: string | null) => void;

interface ThumbnailJob {
  key: string;
  sourcePath: string;
  outputPath: string;
  width: number;
  height: number;
  subscribers: Set<ThumbnailSubscriber>;
}

let thumbnailQueue: ThumbnailJob[] = [];
const thumbnailJobs = new Map<string, ThumbnailJob>();
const activeThumbnailJobs = new Set<string>();

function getThumbnailJob(uri: string, width: number, height: number): ThumbnailJob {
  const file = Gio.File.new_for_uri(uri);
  const sourcePath = file.get_path();
  if (!sourcePath) throw new Error(`Notification image URI is not a local file: ${uri}`);

  const info = file.query_info(
    'standard::size,time::modified,time::modified-usec',
    Gio.FileQueryInfoFlags.NONE,
    null
  );
  const payload = textEncoder.encode(
    `${sourcePath}\0${info.get_size()}:${info.get_attribute_uint64('time::modified')}:` +
      `${info.get_attribute_uint32('time::modified-usec')}\0${width}x${height}\0` +
      THUMBNAIL_VERSION
  );
  const key = GLib.compute_checksum_for_data(GLib.ChecksumType.SHA256, payload);
  if (!key) throw new Error(`Failed to hash notification image: ${sourcePath}`);
  return {
    key,
    sourcePath,
    outputPath: `${cacheRoot}/${key}.webp`,
    width,
    height,
    subscribers: new Set(),
  };
}

function deleteFile(path: string) {
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

function notifySubscribers(job: ThumbnailJob, path: string | null) {
  const subscribers = [...job.subscribers];
  job.subscribers.clear();
  for (const subscriber of subscribers) {
    try {
      subscriber(path);
    } catch (error) {
      console.error('Failed to load generated notification thumbnail:', error);
    }
  }
}

function pruneThumbnailCache() {
  try {
    const directory = Gio.File.new_for_path(cacheRoot);
    const enumerator = directory.enumerate_children(
      CACHE_FILE_ATTRIBUTES,
      Gio.FileQueryInfoFlags.NONE,
      null
    );
    const cachedFiles: {path: string; modified: number}[] = [];
    let info = enumerator.next_file(null);
    while (info) {
      const name = info.get_name();
      if (name.endsWith('.webp')) {
        cachedFiles.push({
          path: `${cacheRoot}/${name}`,
          modified: info.get_attribute_uint64('time::modified'),
        });
      }
      info = enumerator.next_file(null);
    }
    enumerator.close(null);

    cachedFiles
      .sort((a, b) => b.modified - a.modified)
      .slice(MAX_CACHE_FILES)
      .forEach(file => deleteFile(file.path));
  } catch (error) {
    console.error('Failed to prune notification thumbnail cache:', error);
  }
}

async function generateThumbnail(job: ThumbnailJob) {
  GLib.mkdir_with_parents(cacheRoot, 0o755);
  const temporaryPath = `${job.outputPath}.tmp-${GLib.uuid_string_random()}`;
  const errors: string[] = [];

  try {
    const process = subprocess({
      cmd: [
        'magick',
        '-limit',
        'thread',
        '1',
        `${job.sourcePath}[0]`,
        '-auto-orient',
        '-colorspace',
        'sRGB',
        '-strip',
        '-thumbnail',
        `${job.width}x${job.height}`,
        '-quality',
        '80',
        '-define',
        'webp:method=2',
        `webp:${temporaryPath}`,
      ],
      err: line => errors.push(line),
    });
    activeThumbnailJobs.add(job.key);

    const {code, signaled} = await waitForProcess(process);
    if (job.subscribers.size === 0) return;
    if (signaled || code !== 0) {
      throw new Error(errors.join('\n') || `magick exited with status ${code}`);
    }

    Gio.File.new_for_path(temporaryPath).move(
      Gio.File.new_for_path(job.outputPath),
      Gio.FileCopyFlags.OVERWRITE,
      null,
      null
    );
    notifySubscribers(job, job.outputPath);
    pruneThumbnailCache();
  } catch (error) {
    if (job.subscribers.size > 0) {
      console.error(`Failed to generate notification thumbnail for ${job.sourcePath}:`, error);
      notifySubscribers(job, null);
    }
  } finally {
    activeThumbnailJobs.delete(job.key);
    thumbnailJobs.delete(job.key);
    deleteFile(temporaryPath);
    pumpThumbnailQueue();
  }
}

function pumpThumbnailQueue() {
  while (activeThumbnailJobs.size < MAX_THUMBNAIL_WORKERS) {
    const job = thumbnailQueue.shift();
    if (!job) return;
    if (job.subscribers.size > 0) void generateThumbnail(job);
    else thumbnailJobs.delete(job.key);
  }
}

function cancelSubscription(job: ThumbnailJob, subscriber: ThumbnailSubscriber) {
  job.subscribers.delete(subscriber);
  if (job.subscribers.size > 0) return;

  if (activeThumbnailJobs.has(job.key)) return;

  thumbnailQueue = thumbnailQueue.filter(queuedJob => queuedJob !== job);
  thumbnailJobs.delete(job.key);
}

export function subscribeNotificationThumbnail(
  uri: string,
  width: number,
  height: number,
  subscriber: ThumbnailSubscriber
) {
  const candidate = getThumbnailJob(uri, width, height);
  if (GLib.file_test(candidate.outputPath, GLib.FileTest.IS_REGULAR)) {
    subscriber(candidate.outputPath);
    return () => {};
  }

  const job = thumbnailJobs.get(candidate.key) ?? candidate;
  job.subscribers.add(subscriber);
  if (!thumbnailJobs.has(job.key)) {
    thumbnailJobs.set(job.key, job);
    thumbnailQueue.push(job);
    pumpThumbnailQueue();
  }

  return () => cancelSubscription(job, subscriber);
}
