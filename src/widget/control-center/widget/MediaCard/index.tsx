import {For} from 'ags';
import {Gtk} from 'ags/gtk4';

import Mpris from 'gi://AstalMpris';

import {createMediaCardState} from '@/stores/media/media';
import {LucideIcon} from '@/widget/common/lucide';
import PlayerCard from '@/widget/control-center/widget/MediaCard/PlayerCard';

export default function MediaCard() {
  const state = createMediaCardState();

  return (
    <box class="cc-media-container" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <box
        class="cc-media-empty"
        visible={state.hasPlayers.as(hasPlayers => !hasPlayers)}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
      >
        <LucideIcon name="music" pixelSize={25} class="cc-media-empty-icon" />
        <label label="No Media Playing" class="cc-media-empty-label" />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL}>
        <For each={state.activePlayer.as(player => (player ? [player] : []))}>
          {(player: Mpris.Player) => (
            <PlayerCard player={player} canSwitch={state.canSwitch} onSwitch={state.switchPlayer} />
          )}
        </For>
      </box>
    </box>
  );
}
