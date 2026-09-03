import system from 'system';

import {Gtk} from 'ags/gtk4';
import {type Timer, timeout} from 'ags/time';

import Notifd from 'gi://AstalNotifd';

import {type SharedTexture, acquireNotificationTexture} from '@/stores/notification/imageCache';
import {subscribeNotificationThumbnail} from '@/stores/notification/notificationThumbnail';

const IMAGE_RELEASE_DELAY_MS = 300;
const GC_DELAY_MS = 100;

interface PictureResource {
  picture: Gtk.Picture;
  uri: string;
  logicalWidth: number;
  logicalHeight: number;
  mapHook: number;
  destroyHook: number;
  destroyed: boolean;
  root: Gtk.Widget | null;
  rootUnmapHook: number | null;
  thumbnail: boolean;
  thumbnailUnsubscribe: (() => void) | null;
  texture: SharedTexture | null;
}

let garbageCollectionTimer: Timer | null = null;

function scheduleGarbageCollection() {
  garbageCollectionTimer?.cancel();
  garbageCollectionTimer = timeout(GC_DELAY_MS, () => {
    garbageCollectionTimer = null;
    try {
      system.gc();
    } catch (error) {
      console.error(error);
    }
  });
}

export class NotificationImageResources {
  private readonly pictures: PictureResource[] = [];
  private releaseTimer: Timer | null = null;
  private disposed = false;
  private imagesEnabled = true;
  private readonly resolvedHook: number;

  constructor(private readonly notification: Notifd.Notification) {
    this.resolvedHook = notification.connect('resolved', () => this.scheduleRelease());
  }

  bindPicture(
    picture: Gtk.Picture,
    uri: string,
    logicalWidth: number,
    logicalHeight: number,
    thumbnail = false
  ) {
    const resource: PictureResource = {
      picture,
      uri,
      logicalWidth,
      logicalHeight,
      mapHook: 0,
      destroyHook: 0,
      destroyed: false,
      root: null,
      rootUnmapHook: null,
      thumbnail,
      thumbnailUnsubscribe: null,
      texture: null,
    };
    resource.mapHook = picture.connect('map', () => this.load(resource));
    resource.destroyHook = picture.connect('destroy', () => {
      resource.destroyed = true;
      this.release(resource);
      this.disconnectRoot(resource);
    });
    this.pictures.push(resource);

    if (picture.get_mapped()) this.load(resource);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.imagesEnabled = false;
    this.releaseTimer?.cancel();
    this.releaseTimer = null;

    for (const resource of this.pictures) {
      this.release(resource);
      if (resource.destroyed) continue;
      resource.picture.disconnect(resource.mapHook);
      resource.picture.disconnect(resource.destroyHook);
      this.disconnectRoot(resource);
    }
    this.pictures.length = 0;
    this.notification.disconnect(this.resolvedHook);
    scheduleGarbageCollection();
  }

  private load(resource: PictureResource) {
    if (this.disposed || !this.imagesEnabled || resource.texture || resource.thumbnailUnsubscribe)
      return;

    try {
      this.connectRoot(resource);
      const scaleFactor = Math.max(1, resource.picture.get_scale_factor());
      const width = resource.logicalWidth * scaleFactor;
      const height = resource.logicalHeight * scaleFactor;
      if (!resource.thumbnail) {
        this.loadTexture(resource, resource.uri, width, height);
        return;
      }

      let completed = false;
      const unsubscribe = subscribeNotificationThumbnail(resource.uri, width, height, path => {
        completed = true;
        resource.thumbnailUnsubscribe = null;
        if (this.disposed || !this.imagesEnabled || resource.destroyed) return;
        if (path) this.loadTexture(resource, `file://${path}`, width, height);
        else this.loadTexture(resource, resource.uri, width, height);
      });
      if (!completed) resource.thumbnailUnsubscribe = unsubscribe;
    } catch (error) {
      console.error(error);
    }
  }

  private loadTexture(resource: PictureResource, uri: string, width: number, height: number) {
    resource.texture = acquireNotificationTexture(uri, width, height);
    resource.picture.set_paintable(resource.texture.texture);
  }

  private release(resource: PictureResource) {
    resource.thumbnailUnsubscribe?.();
    resource.thumbnailUnsubscribe = null;
    if (!resource.texture) return;
    if (!resource.destroyed) resource.picture.set_paintable(null);
    resource.texture.release();
    resource.texture = null;
    scheduleGarbageCollection();
  }

  private releaseImages() {
    for (const resource of this.pictures) this.release(resource);
  }

  private connectRoot(resource: PictureResource) {
    const root = resource.picture.get_root() as Gtk.Widget | null;
    if (!root || resource.root === root) return;

    this.disconnectRoot(resource);
    resource.root = root;
    resource.rootUnmapHook = root.connect('unmap', () => this.release(resource));
  }

  private disconnectRoot(resource: PictureResource) {
    if (resource.root && resource.rootUnmapHook !== null) {
      resource.root.disconnect(resource.rootUnmapHook);
    }
    resource.root = null;
    resource.rootUnmapHook = null;
  }

  private scheduleRelease() {
    this.imagesEnabled = false;
    this.releaseTimer?.cancel();
    this.releaseTimer = timeout(IMAGE_RELEASE_DELAY_MS, () => {
      this.releaseTimer = null;
      this.releaseImages();
    });
  }
}
