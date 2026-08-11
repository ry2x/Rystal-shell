import { Gtk } from 'ags/gtk4';

import GLib from 'gi://GLib';

import type { Wallpaper } from '../../../stores/wallpaper';

export type WallpaperCardController = {
  widget: Gtk.Button;
  wallpaper: Wallpaper | null;
  bind: (wallpaper: Wallpaper) => void;
  refreshImage: () => void;
  setSelected: (selected: boolean) => void;
  clear: () => void;
};

export function createWallpaperCard(onClicked: (card: WallpaperCardController) => void) {
  const picture = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canShrink: true,
    hexpand: true,
    vexpand: true,
  });
  picture.set_size_request(384, 252);

  const button = new Gtk.Button({
    cssClasses: ['wallpaper-card'],
    canFocus: false,
    overflow: Gtk.Overflow.HIDDEN,
    child: picture,
  });
  button.set_size_request(384, 252);

  const controller: WallpaperCardController = {
    widget: button,
    wallpaper: null,
    bind(wallpaper) {
      controller.wallpaper = wallpaper;
      button.set_tooltip_text(wallpaper.relativePath);
      controller.refreshImage();
    },
    refreshImage() {
      const wallpaper = controller.wallpaper;
      if (!wallpaper) return;
      const imagePath = GLib.file_test(wallpaper.thumbnailPath, GLib.FileTest.IS_REGULAR)
        ? wallpaper.thumbnailPath
        : wallpaper.path;
      picture.set_filename(imagePath);
    },
    setSelected(selected) {
      if (selected) button.add_css_class('selected');
      else button.remove_css_class('selected');
    },
    clear() {
      picture.set_filename(null);
      button.set_tooltip_text(null);
      button.remove_css_class('selected');
      controller.wallpaper = null;
    },
  };

  button.connect('clicked', () => onClicked(controller));
  return controller;
}
