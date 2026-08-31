import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import Mpris from 'gi://AstalMpris';
import Pango from 'gi://Pango';

import {type UiScaleContext} from '@/lib/uiScale';
import {createPlayerArtwork} from '@/stores/media/media';
import CavaWidget from '@/widget/control-center/widget/MediaCard/CavaWidget';
import PlayerArtwork from '@/widget/control-center/widget/MediaCard/PlayerArtwork';
import PlayerControls from '@/widget/control-center/widget/MediaCard/PlayerControls';
import {getMediaSource} from '@/widget/control-center/widget/MediaCard/utils';

export interface PlayerCardProps {
  player: Mpris.Player;
  canSwitch: Accessor<boolean>;
  onSwitch: () => void;
  uiScale: UiScaleContext;
}

export default function PlayerCard({player, canSwitch, onSwitch, uiScale}: PlayerCardProps) {
  const artwork = createPlayerArtwork(player, uiScale);
  const mediaSource = getMediaSource(player);

  return (
    <overlay name={player.bus_name} cssClasses={['cc-media-card']}>
      <box heightRequest={uiScale.size(160)} hexpand>
        <CavaWidget uiScale={uiScale} />
      </box>
      <box $type="overlay" class="cc-player-content" spacing={uiScale.size(16)} hexpand>
        <PlayerArtwork artwork={artwork} uiScale={uiScale} />
        <PlayerControls
          player={player}
          canSwitch={canSwitch}
          onSwitch={onSwitch}
          uiScale={uiScale}
        />
      </box>
      <box
        $type="overlay"
        class="cc-media-source"
        spacing={uiScale.size(5)}
        halign={Gtk.Align.END}
        valign={Gtk.Align.END}
        marginBottom={uiScale.size(10)}
        marginEnd={uiScale.size(12)}
      >
        <image iconName={mediaSource.iconName} pixelSize={uiScale.size(14)} />
        <label
          label={mediaSource.name}
          ellipsize={Pango.EllipsizeMode.END}
          maxWidthChars={16}
          lines={1}
        />
      </box>
    </overlay>
  );
}
