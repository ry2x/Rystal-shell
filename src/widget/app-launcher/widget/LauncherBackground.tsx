import {Gtk} from 'ags/gtk4';

import {registerLauncherBackground} from '@/stores/application/launcherBackground';

export function createLauncherBackground() {
  const picture = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canTarget: false,
    canShrink: true,
    hexpand: true,
    vexpand: true,
    halign: Gtk.Align.FILL,
    valign: Gtk.Align.FILL,
    widthRequest: 1,
    heightRequest: 1,
  });

  const unregister = registerLauncherBackground(picture);
  picture.connect('destroy', unregister);

  return picture;
}
