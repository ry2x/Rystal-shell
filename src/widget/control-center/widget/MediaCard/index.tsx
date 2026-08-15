import { For } from 'ags';
import { Gtk } from 'ags/gtk4';

import Mpris from 'gi://AstalMpris';

import { createMediaCardState } from '../../../../stores/media';
import { LucideIcon } from '../../../../widget/common/lucide';
import PlayerCard from './PlayerCard';

export default function MediaCard() {
  const state = createMediaCardState();

  return (
    <box class="cc-media-container" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <box
        visible={state.hasPlayers.as((hasPlayers) => !hasPlayers)}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        css="min-height: 160px;"
      >
        <LucideIcon
          name="music"
          pixelSize={25}
          css="margin-right: 8px; color: alpha(currentColor, 0.5);"
        />
        <label label="No Media Playing" css="color: alpha(currentColor, 0.5); font-weight: 700;" />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL}>
        <For each={state.activePlayer.as((player) => (player ? [player] : []))}>
          {(player: Mpris.Player) => (
            <PlayerCard player={player} canSwitch={state.canSwitch} onSwitch={state.switchPlayer} />
          )}
        </For>
      </box>
    </box>
  );
}
