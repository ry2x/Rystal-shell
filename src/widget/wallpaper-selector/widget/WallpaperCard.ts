import {Gtk} from 'ags/gtk4';

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {loadTextureFromUri} from '@/lib/image';
import {type UiScaleContext} from '@/lib/uiScale';
import type {Wallpaper} from '@/stores/wallpaper/wallpaper';

export class WallpaperCardController {
  readonly widget: Gtk.Button;

  private readonly picture: Gtk.Picture;
  private boundWallpaper: Wallpaper | null = null;

  constructor(
    onClicked: (card: WallpaperCardController) => void,
    private readonly uiScale: UiScaleContext
  ) {
    const cardWidth = uiScale.size(384);
    const cardHeight = uiScale.size(252);
    this.picture = new Gtk.Picture({
      contentFit: Gtk.ContentFit.COVER,
      canShrink: true,
      hexpand: true,
      vexpand: true,
      widthRequest: cardWidth,
      heightRequest: cardHeight,
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
      widthRequest: cardWidth,
      heightRequest: cardHeight,
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
          this.uiScale.size(384),
          this.uiScale.size(252)
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
