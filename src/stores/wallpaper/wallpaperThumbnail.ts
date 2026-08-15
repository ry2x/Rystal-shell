import { execAsync } from 'ags/process';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { ryprlandCacheDir } from '../../lib/paths';
import type { Wallpaper } from './wallpaper';

const THUMBNAIL_WIDTH = 384;
const THUMBNAIL_HEIGHT = 252;
const THUMBNAIL_VERSION = `v7-${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`;
const MAX_THUMBNAIL_WORKERS = 4;
const cacheRoot = `${ryprlandCacheDir}/wallpapers/thumbnails`;
const thumbnailSubscribers = new Set<(path: string, thumbnailPath: string) => void>();
const textEncoder = new TextEncoder();

interface ThumbnailJob {
  wallpaper: Wallpaper;
  generation: number;
  priority: number;
}

let generation = 0;
let activeWorkers = 0;
let thumbnailQueue: ThumbnailJob[] = [];
const queuedThumbnails = new Map<string, ThumbnailJob>();

function thumbnailKey(path: string, size: number, modified: number) {
  const payload = textEncoder.encode(`${path}\0${size}:${modified}\0${THUMBNAIL_VERSION}`);
  return GLib.compute_checksum_for_data(GLib.ChecksumType.SHA256, payload);
}

export function getWallpaperThumbnailPath(path: string, size: number, modified: number) {
  return `${cacheRoot}/${thumbnailKey(path, size, modified)}.png`;
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

export function cancelWallpaperThumbnailWork() {
  generation++;
  thumbnailQueue = [];
  queuedThumbnails.clear();
}
