import {type Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import Mpris from 'gi://AstalMpris';
import Pango from 'gi://Pango';

import {createPlayerArtwork} from '@/stores/media/media';
import CavaWidget from '@/widget/control-center/widget/MediaCard/CavaWidget';
import PlayerArtwork from '@/widget/control-center/widget/MediaCard/PlayerArtwork';
import PlayerControls from '@/widget/control-center/widget/MediaCard/PlayerControls';
import {getMediaSource} from '@/widget/control-center/widget/MediaCard/utils';

export interface PlayerCardProps {
  player: Mpris.Player;
  canSwitch: Accessor<boolean>;
  onSwitch: () => void;
}

export default function PlayerCard({player, canSwitch, onSwitch}: PlayerCardProps) {
  const artwork = createPlayerArtwork(player);
  const mediaSource = getMediaSource(player);

  return (
    <overlay name={player.bus_name} cssClasses={['cc-media-card']}>
      <box heightRequest={160} hexpand>
        <CavaWidget />
      </box>
      <box $type="overlay" class="cc-player-content" spacing={16} hexpand>
        <PlayerArtwork artwork={artwork} />
        <PlayerControls player={player} canSwitch={canSwitch} onSwitch={onSwitch} />
      </box>
      <box
        $type="overlay"
        class="cc-media-source"
        spacing={5}
        halign={Gtk.Align.END}
        valign={Gtk.Align.END}
        marginBottom={10}
        marginEnd={12}
      >
        <image iconName={mediaSource.iconName} pixelSize={14} />
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
