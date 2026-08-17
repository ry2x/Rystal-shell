import {Gtk} from 'ags/gtk4';

import GLib from 'gi://GLib';

import type {Wallpaper} from '@/stores/wallpaper/wallpaper';

const CARD_WIDTH = 384;
const CARD_HEIGHT = 252;

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
      widthRequest: CARD_WIDTH,
      heightRequest: CARD_HEIGHT,
    });

    this.widget = new Gtk.Button({
      cssClasses: ['wallpaper-card'],
      canFocus: false,
      overflow: Gtk.Overflow.HIDDEN,
      child: this.picture,
      widthRequest: CARD_WIDTH,
      heightRequest: CARD_HEIGHT,
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
    this.picture.set_filename(imagePath);
  }

  setSelected(selected: boolean) {
    if (selected) this.widget.add_css_class('selected');
    else this.widget.remove_css_class('selected');
  }

  clear() {
    this.picture.set_filename(null);
    this.widget.set_tooltip_text(null);
    this.widget.remove_css_class('selected');
    this.boundWallpaper = null;
  }
}
