import system from 'system';

import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';
import {type Timer, timeout} from 'ags/time';

import Notifd from 'gi://AstalNotifd';
import Pango from 'gi://Pango';

import {type SharedTexture, acquireNotificationTexture} from '@/stores/notification/imageCache';
import {LucideIcon} from '@/widget/common/lucide';

export interface NotificationCardProps {
  notif: Notifd.Notification;
  onDismiss?: () => void;
}

const IMAGE_RELEASE_DELAY_MS = 300;

function resolveImage(image: string | null) {
  if (!image) return null;
  if (image.startsWith('file://')) return image;
  if (image.startsWith('/')) return `file://${image}`;
  return null;
}

function collectGarbage() {
  try {
    system.gc();
  } catch (error) {
    console.error(error);
  }
}

class NotificationImageResources {
  appIconPicture: Gtk.Picture | null = null;
  imagePicture: Gtk.Picture | null = null;
  private appIconTexture: SharedTexture | null = null;
  private imageTexture: SharedTexture | null = null;

  private releaseTimer: Timer | null = null;
  private disposed = false;
  private readonly resolvedHook: number;

  constructor(private readonly notification: Notifd.Notification) {
    this.resolvedHook = notification.connect('resolved', () => this.scheduleRelease());
  }

  private scheduleRelease() {
    this.releaseTimer?.cancel();
    this.releaseTimer = timeout(IMAGE_RELEASE_DELAY_MS, () => {
      this.releaseTimer = null;
      this.releaseImages();
      collectGarbage();
    });
  }

  private releaseImages() {
    this.appIconPicture?.set_paintable(null);
    this.imagePicture?.set_paintable(null);
    this.appIconPicture = null;
    this.imagePicture = null;
    this.appIconTexture?.release();
    this.imageTexture?.release();
    this.appIconTexture = null;
    this.imageTexture = null;
  }

  setAppIcon(picture: Gtk.Picture, uri: string) {
    this.appIconPicture = picture;
    this.appIconTexture = acquireNotificationTexture(uri, 64, 64);
    picture.set_paintable(this.appIconTexture.texture);
  }

  setImage(picture: Gtk.Picture, uri: string) {
    this.imagePicture = picture;
    this.imageTexture = acquireNotificationTexture(uri, 760, 280);
    picture.set_paintable(this.imageTexture.texture);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseTimer?.cancel();
    this.releaseTimer = null;
    this.releaseImages();
    this.notification.disconnect(this.resolvedHook);
    collectGarbage();
  }
}

export default function NotificationCard({notif, onDismiss}: NotificationCardProps) {
  const appIcon = notif.app_icon || notif.desktop_entry || notif.image;
  const appIconPath = resolveImage(appIcon);
  const imageToDisplay = resolveImage(notif.image);
  const time = new Date(notif.time * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const resources = new NotificationImageResources(notif);

  onCleanup(() => resources.dispose());

  return (
    <box
      onDestroy={() => resources.dispose()}
      class={`notif-card urgency-${notif.urgency}`}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
      widthRequest={380}
    >
      <box spacing={12}>
        <box class="notif-icon-container" valign={Gtk.Align.START}>
          {appIconPath ? (
            <box class="notif-app-icon" overflow={Gtk.Overflow.HIDDEN} valign={Gtk.Align.CENTER}>
              <overlay>
                <box widthRequest={32} heightRequest={32} />
                <Gtk.Picture
                  $type="overlay"
                  canFocus={false}
                  canShrink
                  contentFit={Gtk.ContentFit.CONTAIN}
                  $={picture => {
                    try {
                      resources.setAppIcon(picture, appIconPath);
                    } catch (error) {
                      console.error(error);
                    }
                  }}
                />
              </overlay>
            </box>
          ) : appIcon ? (
            <image iconName={appIcon} pixelSize={32} valign={Gtk.Align.CENTER} />
          ) : (
            <LucideIcon name="message-square" pixelSize={24} valign={Gtk.Align.CENTER} />
          )}
        </box>

        <box orientation={Gtk.Orientation.VERTICAL} hexpand>
          <box orientation={Gtk.Orientation.HORIZONTAL}>
            <label
              label={notif.app_name ?? 'Notify-send'}
              class="notif-app"
              xalign={0}
              ellipsize={Pango.EllipsizeMode.END}
              lines={1}
              maxWidthChars={18}
            />
            <box hexpand />
            <label label={time} class="notif-time" xalign={1} />
            <button
              class="notif-close"
              onClicked={() => {
                onDismiss?.();
                notif.dismiss();
              }}
              valign={Gtk.Align.CENTER}
            >
              <LucideIcon name="x" pixelSize={14} />
            </button>
          </box>
          <label
            label={notif.summary}
            class="notif-summary"
            xalign={0}
            ellipsize={Pango.EllipsizeMode.END}
            lines={1}
            maxWidthChars={24}
          />
        </box>
      </box>

      {notif.body && (
        <label
          label={notif.body}
          class="notif-body"
          useMarkup
          xalign={0}
          wrap
          wrapMode={Pango.WrapMode.WORD_CHAR}
          maxWidthChars={36}
          lines={3}
          ellipsize={Pango.EllipsizeMode.END}
        />
      )}

      {imageToDisplay && (
        <box class="notif-image" overflow={Gtk.Overflow.HIDDEN}>
          <overlay>
            <box hexpand heightRequest={140} />
            <Gtk.Picture
              $type="overlay"
              canFocus={false}
              canShrink
              contentFit={Gtk.ContentFit.COVER}
              $={picture => {
                try {
                  resources.setImage(picture, imageToDisplay);
                } catch (error) {
                  console.error(error);
                }
              }}
            />
          </overlay>
        </box>
      )}

      {notif.get_actions().length > 0 && (
        <box spacing={8} class="notif-actions" marginTop={4}>
          {notif.get_actions().map(action => (
            <button class="notif-action-btn" hexpand onClicked={() => notif.invoke(action.id)}>
              <label label={action.label} />
            </button>
          ))}
        </box>
      )}
    </box>
  );
}
