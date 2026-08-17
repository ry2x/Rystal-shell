import {Gtk} from 'ags/gtk4';

import GLib from 'gi://GLib?version=2.0';

import {appConfig} from '@/lib/config';
import {loadTextureFromUri} from '@/lib/image';
import {getOsInfo, uptime, userName} from '@/stores/system/system';

const DEFAULT_AVATAR_PATH = `${GLib.get_home_dir()}/Profile/Profile.png`;
const osInfoCache = getOsInfo();
const profile = appConfig.profile ?? {};
const profileHandle = profile.handle ?? userName;
const profileOs = profile.os ?? osInfoCache;

function resolveAvatarPath(path: string | undefined) {
  if (!path) return DEFAULT_AVATAR_PATH;
  return path.startsWith('~/') ? GLib.get_home_dir() + path.slice(1) : path;
}

function createProfileAvatar(path: string) {
  const avatar = new Gtk.Picture({
    contentFit: Gtk.ContentFit.COVER,
    canShrink: true,
  });

  try {
    avatar.set_paintable(loadTextureFromUri(`file://${path}`, 64, 64));
  } catch (error) {
    console.error('Failed to load profile avatar:', error);
  }

  return avatar;
}

export default function ProfileCard() {
  const avatar = createProfileAvatar(resolveAvatarPath(profile.avatarPath));

  return (
    <box class="profile-card widget-card" spacing={16} orientation={Gtk.Orientation.HORIZONTAL}>
      {/* Left: Avatar Area */}
      <box class="profile-avatar" overflow={Gtk.Overflow.HIDDEN}>
        {avatar}
      </box>

      {/* Right: Information Area */}
      <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} spacing={4}>
        <label label={profileHandle} class="profile-name" halign={Gtk.Align.START} />
        <label label={profileOs} class="profile-env" halign={Gtk.Align.START} />
        <label
          label={uptime.as(u => `Uptime: ${u.replace('up ', '')}`)}
          class="profile-uptime"
          halign={Gtk.Align.START}
        />
      </box>
    </box>
  );
}
