import Apps from 'gi://AstalApps';
import Mpris from 'gi://AstalMpris';

const apps = new Apps.Apps();

export interface MediaSource {
  iconName: string;
  name: string;
}

export function getMediaSource(player: Mpris.Player): MediaSource {
  const entry = player.entry || '';
  const normalizedEntry = entry.replace(/\.desktop$/, '');
  const app = apps.get_list().find((candidate) => {
    const candidateEntry = candidate.entry.replace(/\.desktop$/, '');
    return candidateEntry === normalizedEntry;
  });

  return {
    iconName: app?.iconName || 'multimedia-player-symbolic',
    name: app?.name || player.identity || entry || 'Media Player',
  };
}
