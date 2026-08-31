import {type Process, subprocess} from 'ags/process';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {rystalShellCacheDir} from '@/lib/paths';
import type {Wallpaper} from '@/stores/wallpaper/wallpaper';

const THUMBNAIL_WIDTH = 768;
const THUMBNAIL_HEIGHT = 504;
const THUMBNAIL_VERSION = `v8-${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`;
const MAX_THUMBNAIL_WORKERS = 4;
const cacheRoot = `${rystalShellCacheDir}/wallpapers/thumbnails`;
const thumbnailSubscribers = new Set<(path: string, thumbnailPath: string) => void>();
const textEncoder = new TextEncoder();

interface ThumbnailJob {
  wallpaper: Wallpaper;
  generation: number;
  priority: number;
}

interface ActiveThumbnailJob {
  job: ThumbnailJob;
  process: Process;
  temporaryPath: string;
  cancelled: boolean;
}

let generation = 0;
let thumbnailQueue: ThumbnailJob[] = [];
const queuedThumbnails = new Map<string, ThumbnailJob>();
const activeThumbnailJobs = new Set<ActiveThumbnailJob>();

function thumbnailKey(path: string, size: number, modified: number) {
  const payload = textEncoder.encode(`${path}\0${size}:${modified}\0${THUMBNAIL_VERSION}`);
  return GLib.compute_checksum_for_data(GLib.ChecksumType.SHA256, payload);
}

export function getWallpaperThumbnailPath(path: string, size: number, modified: number) {
  return `${cacheRoot}/${thumbnailKey(path, size, modified)}.webp`;
}

function notifyThumbnailReady(path: string, thumbnailPath: string) {
  for (const subscriber of thumbnailSubscribers) subscriber(path, thumbnailPath);
}

function deleteTemporaryThumbnail(path: string) {
  try {
    Gio.File.new_for_path(path).delete(null);
  } catch {
    // The process may not have created the file, or it may already have been moved.
  }
}

function waitForThumbnailProcess(process: Process) {
  return new Promise<{code: number; signaled: boolean}>(resolve => {
    let exitHook: number | null = null;
    exitHook = process.connect('exit', (_, code, signaled) => {
      if (exitHook !== null) process.disconnect(exitHook);
      resolve({code, signaled});
    });
  });
}

async function generateThumbnail(job: ThumbnailJob) {
  const {wallpaper, generation: jobGeneration} = job;
  if (GLib.file_test(wallpaper.thumbnailPath, GLib.FileTest.IS_REGULAR)) {
    if (jobGeneration === generation) notifyThumbnailReady(wallpaper.path, wallpaper.thumbnailPath);
    return;
  }

  GLib.mkdir_with_parents(cacheRoot, 0o755);
  const temporaryPath = `${wallpaper.thumbnailPath}.tmp-${GLib.uuid_string_random()}`;
  const errors: string[] = [];
  let activeJob: ActiveThumbnailJob | null = null;

  try {
    if (jobGeneration !== generation) return;

    const process = subprocess({
      cmd: [
        'magick',
        '-limit',
        'thread',
        '1',
        `${wallpaper.path}[0]`,
        '-colorspace',
        'sRGB',
        '-strip',
        '-thumbnail',
        `${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}^`,
        '-gravity',
        'center',
        '-extent',
        `${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`,
        '-quality',
        '80',
        '-define',
        'webp:method=2',
        `webp:${temporaryPath}`,
      ],
      err: line => errors.push(line),
    });
    activeJob = {job, process, temporaryPath, cancelled: false};
    activeThumbnailJobs.add(activeJob);

    const {code, signaled} = await waitForThumbnailProcess(process);
    if (activeJob.cancelled || jobGeneration !== generation) return;
    if (signaled || code !== 0) {
      throw new Error(errors.join('\n') || `magick exited with status ${code}`);
    }

    Gio.File.new_for_path(temporaryPath).move(
      Gio.File.new_for_path(wallpaper.thumbnailPath),
      Gio.FileCopyFlags.OVERWRITE,
      null,
      null
    );
    if (jobGeneration === generation) notifyThumbnailReady(wallpaper.path, wallpaper.thumbnailPath);
  } catch (error) {
    if (jobGeneration === generation && !activeJob?.cancelled) {
      console.error(`Failed to generate wallpaper thumbnail for ${wallpaper.path}:`, error);
    }
  } finally {
    if (activeJob) activeThumbnailJobs.delete(activeJob);
    deleteTemporaryThumbnail(temporaryPath);
  }
}

function startThumbnailJob(job: ThumbnailJob) {
  void generateThumbnail(job).finally(pumpThumbnailQueue);
}

function pumpThumbnailQueue() {
  while (activeThumbnailJobs.size < MAX_THUMBNAIL_WORKERS) {
    const job = thumbnailQueue.shift();
    if (!job) return;
    queuedThumbnails.delete(job.wallpaper.path);
    if (job.generation === generation) startThumbnailJob(job);
  }
}

export function ensureWallpaperThumbnails(items: Wallpaper[], priority = true) {
  const currentGeneration = generation;
  for (const wallpaper of items) {
    if (GLib.file_test(wallpaper.thumbnailPath, GLib.FileTest.IS_REGULAR)) continue;
    if (
      [...activeThumbnailJobs].some(
        activeJob =>
          activeJob.job.generation === currentGeneration &&
          activeJob.job.wallpaper.path === wallpaper.path
      )
    ) {
      continue;
    }

    const existing = queuedThumbnails.get(wallpaper.path);
    if (existing) {
      if (priority) existing.priority = 1;
      continue;
    }

    const job = {wallpaper, generation: currentGeneration, priority: priority ? 1 : 0};
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

export function cancelWallpaperThumbnailWork() {
  generation++;
  thumbnailQueue = [];
  queuedThumbnails.clear();

  for (const activeJob of activeThumbnailJobs) {
    activeJob.cancelled = true;
    try {
      activeJob.process.kill();
    } catch {
      // The process may have exited immediately before cancellation.
    }
    deleteTemporaryThumbnail(activeJob.temporaryPath);
  }
}
