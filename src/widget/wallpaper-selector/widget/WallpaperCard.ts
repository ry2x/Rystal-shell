import {Gtk} from 'ags/gtk4';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {loadTextureFromUri} from '@/lib/image';
import {shellGeometry} from '@/lib/shellGeometry';
import type {Wallpaper} from '@/stores/wallpaper/wallpaper';

export class WallpaperCardController {
  readonly widget: Gtk.Button;

  private readonly picture: Gtk.Picture;
  private boundWallpaper: Wallpaper | null = null;

  constructor(onClicked: (card: WallpaperCardController) => void) {
    this.picture = new Gtk.Picture({
      contentFit: Gtk.ContentFit.COVER,
      canShrink: true,
      hexpand: true,
      vexpand: true,
      widthRequest: shellGeometry.wallpaperCardWidth,
      heightRequest: shellGeometry.wallpaperCardHeight,
    });

    const lightOverlay = new Gtk.Box({
      cssClasses: ['wallpaper-light-overlay'],
      canTarget: false,
      hexpand: true,
      vexpand: true,
    });
    const preview = new Gtk.Overlay({child: this.picture});
    preview.add_overlay(lightOverlay);

    this.widget = new Gtk.Button({
      cssClasses: ['wallpaper-card'],
      canFocus: false,
      overflow: Gtk.Overflow.HIDDEN,
      child: preview,
      widthRequest: shellGeometry.wallpaperCardWidth,
      heightRequest: shellGeometry.wallpaperCardHeight,
    });

    this.widget.connect('clicked', () => onClicked(this));
  }

  get wallpaper() {
    return this.boundWallpaper;
  }

  bind(wallpaper: Wallpaper) {
    this.boundWallpaper = wallpaper;
    this.widget.set_tooltip_text(wallpaper.relativePath);
    this.refreshImage();
  }

  refreshImage() {
    const wallpaper = this.boundWallpaper;
    if (!wallpaper) return;

    const imagePath = GLib.file_test(wallpaper.thumbnailPath, GLib.FileTest.IS_REGULAR)
      ? wallpaper.thumbnailPath
      : wallpaper.path;
    try {
      this.picture.set_paintable(
        loadTextureFromUri(
          Gio.File.new_for_path(imagePath).get_uri(),
          shellGeometry.wallpaperCardWidth,
          shellGeometry.wallpaperCardHeight
        )
      );
    } catch (error) {
      console.error(`Failed to load wallpaper image ${imagePath}:`, error);
      this.picture.set_paintable(null);
    }
  }

  setSelected(selected: boolean) {
    if (selected) this.widget.add_css_class('selected');
    else this.widget.remove_css_class('selected');
  }

  clear() {
    this.picture.set_paintable(null);
    this.widget.set_tooltip_text(null);
    this.widget.remove_css_class('selected');
    this.boundWallpaper = null;
  }
}
