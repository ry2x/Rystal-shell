import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import Gdk from 'gi://Gdk';

import {type UiScaleContext} from '@/lib/uiScale';

export interface PlayerArtworkProps {
  artwork: Accessor<Gdk.Texture | null>;
  uiScale: UiScaleContext;
}

export default function PlayerArtwork({artwork, uiScale}: PlayerArtworkProps) {
  // GTK accepts a null paintable, but the generated reactive prop type omits it.
  const paintable = artwork as Accessor<Gdk.Paintable>;

  return (
    <box
      class="cc-player-artwork"
      valign={Gtk.Align.CENTER}
      widthRequest={uiScale.size(80)}
      heightRequest={uiScale.size(80)}
      overflow={Gtk.Overflow.HIDDEN}
    >
      <overlay>
        <box widthRequest={uiScale.size(80)} heightRequest={uiScale.size(80)} />
        <scrolledwindow
          $type="overlay"
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.NEVER}
          propagateNaturalWidth={false}
          propagateNaturalHeight={false}
          widthRequest={uiScale.size(80)}
          heightRequest={uiScale.size(80)}
        >
          <Gtk.Picture
            paintable={paintable}
            contentFit={Gtk.ContentFit.COVER}
            canFocus={false}
            canShrink
          />
        </scrolledwindow>
      </overlay>
    </box>
  );
}
