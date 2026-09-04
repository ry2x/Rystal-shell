import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {registerLauncherImage} from '@/stores/application/launcherPicture';

export function LauncherBackgroundImage() {
  const picture = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canTarget: false,
    canShrink: true,
    hexpand: true,
    vexpand: true,
    halign: Gtk.Align.FILL,
    valign: Gtk.Align.FILL,
    widthRequest: scaleUiSize(1),
    heightRequest: scaleUiSize(1),
  });

  const unregister = registerLauncherImage(picture);
  picture.connect('destroy', unregister);
  onCleanup(unregister);

  return picture;
}
