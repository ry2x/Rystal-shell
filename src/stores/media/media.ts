import {type Accessor, createState, onCleanup} from 'ags';

import Mpris from 'gi://AstalMpris';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';

import {loadTextureFromUri} from '@/lib/image';
import {fetchYouTubeThumbnail} from '@/stores/media/mprisThumbnail';
import {closeAllControlCenters, focusWindow} from '@/stores/shell/windowManager';

export interface MediaCardState {
  activePlayer: Accessor<Mpris.Player | null>;
  hasPlayers: Accessor<boolean>;
  canSwitch: Accessor<boolean>;
  switchPlayer: () => void;
}

export function createMediaCardState(): MediaCardState {
  const mpris = Mpris.get_default();
  const [players, setPlayers] = createState<Mpris.Player[]>(mpris.get_players());
  const [activePlayer, setActivePlayer] = createState<Mpris.Player | null>(null);
  const hasPlayers = players.as(list => list.length > 0);
  const canSwitch = players.as(list => list.length > 1);

  const refreshPlayers = () => {
    const nextPlayers = mpris.get_players();
    setPlayers(nextPlayers);
    const current = activePlayer.peek();
    if (!current || !nextPlayers.some(player => player.bus_name === current.bus_name)) {
      setActivePlayer(nextPlayers[0] ?? null);
    }
  };

  const switchPlayer = () => {
    const list = players.peek();
    const current = activePlayer.peek();
    if (!current || list.length <= 1) return;

    const currentIndex = list.findIndex(player => player.bus_name === current.bus_name);
    setActivePlayer(list[(currentIndex + 1) % list.length]);
  };

  const hook = mpris.connect('notify::players', refreshPlayers);
  refreshPlayers();
  onCleanup(() => mpris.disconnect(hook));

  return {activePlayer, hasPlayers, canSwitch, switchPlayer};
}

function artworkUri(path: string) {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return null;
}

export function createPlayerArtwork(player: Mpris.Player): Accessor<Gdk.Texture | null> {
  const [artwork, setArtwork] = createState<Gdk.Texture | null>(null);
  let disposed = false;
  let updateGeneration = 0;
  let lastYouTubeArt: string | null = null;
  let thumbnailCancellable: Gio.Cancellable | null = null;

  const setArtworkFromPath = (path: string | null) => {
    const uri = path ? artworkUri(path) : null;
    if (!uri) {
      setArtwork(null);
      return;
    }

    try {
      setArtwork(loadTextureFromUri(uri, 160, 160));
    } catch (error) {
      console.error(error);
      setArtwork(null);
    }
  };

  const updateArtwork = async () => {
    const generation = ++updateGeneration;
    thumbnailCancellable?.cancel();
    thumbnailCancellable = null;
    const coverArt = player.cover_art;
    if (coverArt) {
      lastYouTubeArt = null;
      setArtworkFromPath(coverArt);
      return;
    }

    try {
      const cancellable = new Gio.Cancellable();
      thumbnailCancellable = cancellable;
      const youtubeArt = await fetchYouTubeThumbnail(player, cancellable);
      if (disposed || generation !== updateGeneration) return;
      if (youtubeArt && youtubeArt === lastYouTubeArt) return;
      lastYouTubeArt = youtubeArt;
      setArtworkFromPath(youtubeArt);
    } catch (error) {
      if (disposed || generation !== updateGeneration) return;
      console.error(error);
      setArtwork(null);
    } finally {
      if (generation === updateGeneration) thumbnailCancellable = null;
    }
  };

  const coverArtHook = player.connect('notify::cover-art', () => void updateArtwork());
  const metadataHook = player.connect('notify::metadata', () => void updateArtwork());
  void updateArtwork();

  onCleanup(() => {
    disposed = true;
    updateGeneration++;
    thumbnailCancellable?.cancel();
    thumbnailCancellable = null;
    player.disconnect(coverArtHook);
    player.disconnect(metadataHook);
    setArtwork(null);
  });

  return artwork;
}

export function focusMediaPlayer(player: Mpris.Player) {
  try {
    player.raise();
  } catch (error) {
    console.error(error);
  }
  if (!player.entry) return;

  focusWindow(player.entry);
  closeAllControlCenters();
}

export function playPrevious(player: Mpris.Player) {
  player.previous();
}

export function togglePlayback(player: Mpris.Player) {
  player.play_pause();
}

export function playNext(player: Mpris.Player) {
  player.next();
}
