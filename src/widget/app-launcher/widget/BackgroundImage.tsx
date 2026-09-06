import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import {scaleUiSize} from '@/lib/uiScale';
import {registerLauncherImage} from '@/stores/application/launcherPicture';

export function LauncherBackgroundImage() {
  let unregister = () => {};
  onCleanup(() => unregister());

  return (
    <Gtk.Picture
      contentFit={Gtk.ContentFit.COVER}
      canTarget={false}
      canShrink
      hexpand
      vexpand
      halign={Gtk.Align.FILL}
      valign={Gtk.Align.FILL}
      widthRequest={scaleUiSize(1)}
      heightRequest={scaleUiSize(1)}
      $={picture => {
        unregister = registerLauncherImage(picture);
      }}
      onDestroy={() => unregister()}
    />
  );
}
