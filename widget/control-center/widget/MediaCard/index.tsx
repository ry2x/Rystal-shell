import { For, createBinding as bind, createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import Mpris from 'gi://AstalMpris';

import { LucideIcon } from '../../../../lib/lucide';
import PlayerCard from './PlayerCard';

export default function MediaCard() {
  const mpris = Mpris.get_default();

  const [activePlayer, setActivePlayer] = createState<Mpris.Player | null>(null);

  return (
    <box class="cc-media-container" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <box
        visible={bind(mpris, 'players').as((p) => p.length === 0)}
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

      <box
        orientation={Gtk.Orientation.VERTICAL}
        $={(self: Gtk.Box) => {
          const updateActivePlayer = () => {
            const players = mpris.get_players();
            if (players.length > 0) {
              const current = activePlayer();
              if (!current || !players.some((p) => p.bus_name === current.bus_name)) {
                setActivePlayer(players[0]);
              }
            } else {
              setActivePlayer(null);
            }
          };

          const hook = mpris.connect('notify::players', updateActivePlayer);
          updateActivePlayer();
          self.connect('destroy', () => mpris.disconnect(hook));
        }}
      >
        <For each={activePlayer.as((player) => (player ? [player] : []))}>
          {(player: Mpris.Player) => {
            const onSwitch = () => {
              const players = mpris.get_players();
              if (players.length > 1) {
                const idx = players.findIndex((p) => p.bus_name === player.bus_name);
                const nextIdx = (idx + 1) % players.length;
                setActivePlayer(players[nextIdx]);
              }
            };

            return <PlayerCard player={player} onSwitch={onSwitch} name={player.bus_name} />;
          }}
        </For>
      </box>
    </box>
  );
}
