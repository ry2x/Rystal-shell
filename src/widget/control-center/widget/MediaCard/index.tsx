import {For} from 'ags';
import {Gtk} from 'ags/gtk4';

import Mpris from 'gi://AstalMpris';

import {type UiScaleContext} from '@/lib/uiScale';
import {createMediaCardState} from '@/stores/media/media';
import EmptyState from '@/widget/common/EmptyState';
import PlayerCard from '@/widget/control-center/widget/MediaCard/PlayerCard';

export interface MediaCardProps {
  uiScale: UiScaleContext;
}
export default function MediaCard({uiScale}: MediaCardProps) {
  const state = createMediaCardState();

  return (
    <box
      class="cc-media-container"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={uiScale.size(8)}
    >
      <box
        visible={state.hasPlayers.as(hasPlayers => !hasPlayers)}
        heightRequest={uiScale.size(160)}
        halign={Gtk.Align.CENTER}
      >
        <EmptyState
          className="cc-media-empty"
          icon="music"
          label="No Media Playing"
          uiScale={uiScale}
        />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL}>
        <For each={state.activePlayer.as(player => (player ? [player] : []))}>
          {(player: Mpris.Player) => (
            <PlayerCard
              player={player}
              canSwitch={state.canSwitch}
              onSwitch={state.switchPlayer}
              uiScale={uiScale}
            />
          )}
        </For>
      </box>
    </box>
  );
}
