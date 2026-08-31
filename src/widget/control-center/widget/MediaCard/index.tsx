import {For} from 'ags';
import {Gtk} from 'ags/gtk4';

import Mpris from 'gi://AstalMpris';

import {scaleUiSize} from '@/lib/uiScale';
import {createMediaCardState} from '@/stores/media/media';
import EmptyState from '@/widget/common/EmptyState';
import PlayerCard from '@/widget/control-center/widget/MediaCard/PlayerCard';

export default function MediaCard() {
  const state = createMediaCardState();

  return (
    <box class="cc-media-container" orientation={Gtk.Orientation.VERTICAL} spacing={scaleUiSize(8)}>
      <box
        visible={state.hasPlayers.as(hasPlayers => !hasPlayers)}
        heightRequest={scaleUiSize(160)}
        halign={Gtk.Align.CENTER}
      >
        <EmptyState className="cc-media-empty" icon="music" label="No Media Playing" />
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
