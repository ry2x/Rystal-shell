import { Gtk } from 'ags/gtk4';

import GLib from 'gi://GLib?version=2.0';

import { loadTextureFromUri } from '../../../lib/image';
import { appConfig } from '../../../services/config';
import { getOsInfo, uptime, userName } from '../../../services/system';

const osInfoCache = getOsInfo();

export default function ProfileCard() {
  const profile = appConfig.profile || {};
  let avatarPath = profile.avatarPath || '/home/haku/Profile/Profile.png';
  if (avatarPath.startsWith('~/')) {
    avatarPath = GLib.get_home_dir() + avatarPath.slice(1);
  }
  const handle = profile.handle || userName;
  const osInfo = profile.os || osInfoCache;
  const avatar = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canShrink: true,
  });
  try {
    avatar.set_paintable(loadTextureFromUri(`file://${avatarPath}`, 64, 64, true));
  } catch (error) {
    console.error('Failed to load profile avatar:', error);
  }

  return (
    <box class="profile-card widget-card" spacing={16} orientation={Gtk.Orientation.HORIZONTAL}>
      {/* Left: Avatar Area */}
      <box
        class="profile-avatar"
        overflow={Gtk.Overflow.HIDDEN}
        css={`
          border-radius: 50%;
          min-width: 64px;
          min-height: 64px;
        `}
      >
        {avatar}
      </box>

      {/* Right: Information Area */}
      <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} spacing={4}>
        <label label={handle} class="profile-name" halign={Gtk.Align.START} />
        <label label={osInfo} class="profile-env" halign={Gtk.Align.START} />
        <label
          label={uptime.as((u) => `Uptime: ${u.replace('up ', '')}`)}
          class="profile-uptime"
          halign={Gtk.Align.START}
        />
      </box>
    </box>
  );
}
