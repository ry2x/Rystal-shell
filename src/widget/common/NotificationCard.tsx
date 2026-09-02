import {onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import Notifd from 'gi://AstalNotifd';
import Pango from 'gi://Pango';

import {scaleUiSize} from '@/lib/uiScale';
import {NotificationImageResources} from '@/stores/notification/notificationImage';
import {LucideIcon} from '@/widget/common/lucide';

export interface NotificationCardProps {
  notif: Notifd.Notification;
  onDismiss?: () => void;
}

function resolveImage(image: string | null) {
  if (!image) return null;
  if (image.startsWith('file://')) return image;
  if (image.startsWith('/')) return `file://${image}`;
  return null;
}

export default function NotificationCard({notif, onDismiss}: NotificationCardProps) {
  const appIcon = notif.app_icon || notif.desktop_entry;
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
      spacing={scaleUiSize(8)}
      widthRequest={scaleUiSize(380)}
    >
      <box spacing={scaleUiSize(12)}>
        <box class="notif-icon-container" valign={Gtk.Align.START}>
          {appIconPath ? (
            <box class="notif-app-icon" overflow={Gtk.Overflow.HIDDEN} valign={Gtk.Align.CENTER}>
              <overlay>
                <box widthRequest={scaleUiSize(32)} heightRequest={scaleUiSize(32)} />
                <Gtk.Picture
                  $type="overlay"
                  canFocus={false}
                  canShrink
                  contentFit={Gtk.ContentFit.CONTAIN}
                  $={picture => {
                    resources.bindPicture(picture, appIconPath, scaleUiSize(32), scaleUiSize(32));
                  }}
                />
              </overlay>
            </box>
          ) : appIcon ? (
            <image iconName={appIcon} pixelSize={scaleUiSize(32)} valign={Gtk.Align.CENTER} />
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
            <box hexpand heightRequest={scaleUiSize(140)} />
            <Gtk.Picture
              $type="overlay"
              canFocus={false}
              canShrink
              contentFit={Gtk.ContentFit.COVER}
              $={picture => {
                resources.bindPicture(
                  picture,
                  imageToDisplay,
                  scaleUiSize(380),
                  scaleUiSize(140),
                  true
                );
              }}
            />
          </overlay>
        </box>
      )}

      {notif.get_actions().length > 0 && (
        <box spacing={scaleUiSize(8)} class="notif-actions" marginTop={scaleUiSize(4)}>
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
