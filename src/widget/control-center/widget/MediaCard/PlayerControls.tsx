import { type Accessor, createBinding } from 'ags';
import { Gtk } from 'ags/gtk4';

import Mpris from 'gi://AstalMpris';
import Pango from 'gi://Pango';

import { focusMediaPlayer, playNext, playPrevious, togglePlayback } from '../../../../stores/media';
import { LucideIcon } from '../../../../widget/common/lucide';

export interface PlayerControlsProps {
  player: Mpris.Player;
  canSwitch: Accessor<boolean>;
  onSwitch: () => void;
}

export default function PlayerControls({ player, canSwitch, onSwitch }: PlayerControlsProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
      <button
        class="cc-player-title-button"
        halign={Gtk.Align.START}
        onClicked={() => focusMediaPlayer(player)}
      >
        <label
          label={createBinding(player, 'title').as((title) => title || 'Unknown')}
          class="cc-player-title"
          halign={Gtk.Align.START}
          wrap
          wrapMode={Pango.WrapMode.WORD_CHAR}
          maxWidthChars={18}
          lines={2}
          ellipsize={Pango.EllipsizeMode.END}
        />
      </button>
      <label
        label={createBinding(player, 'artist').as((artist) => artist || 'Unknown')}
        class="cc-player-artist"
        halign={Gtk.Align.START}
        ellipsize={Pango.EllipsizeMode.END}
        maxWidthChars={20}
        lines={1}
      />
      <box spacing={16} halign={Gtk.Align.START}>
        <button class="icon-btn" onClicked={() => playPrevious(player)}>
          <LucideIcon name="skip-back" pixelSize={20} />
        </button>
        <button class="icon-btn" onClicked={() => togglePlayback(player)}>
          <LucideIcon
            name={createBinding(player, 'playback_status').as((status) =>
              status === Mpris.PlaybackStatus.PLAYING ? 'pause' : 'play',
            )}
            pixelSize={20}
          />
        </button>
        <button class="icon-btn" onClicked={() => playNext(player)}>
          <LucideIcon name="skip-forward" pixelSize={20} />
        </button>
        <revealer transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT} revealChild={canSwitch}>
          <button class="icon-btn" onClicked={onSwitch} tooltipText="Switch Player">
            <LucideIcon name="arrow-right-left" pixelSize={18} />
          </button>
        </revealer>
      </box>
    </box>
  );
}
