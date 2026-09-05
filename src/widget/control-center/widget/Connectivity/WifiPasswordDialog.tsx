import {onCleanup} from 'ags';
import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';
import {type Timer, idle} from 'ags/time';

import Pango from 'gi://Pango';

import {scaleUiSize} from '@/lib/uiScale';
import {createWifiPasswordDialogState} from '@/stores/connectivity/wifiPasswordDialog';
import {LucideIcon} from '@/widget/common/lucide';

export interface WifiPasswordDialogProps {
  monitor: Gdk.Monitor;
}

export default function WifiPasswordDialog({monitor}: WifiPasswordDialogProps) {
  const connector = monitor.get_connector() ?? '';
  const state = createWifiPasswordDialogState(connector);
  let entry: Gtk.Entry | null = null;
  let focusTimer: Timer | null = null;

  const submit = () => void state.submit(entry?.get_text() ?? '');
  const unsubscribe = state.activation.subscribe(() => {
    entry?.set_text('');
    focusTimer?.cancel();
    focusTimer = idle(() => {
      focusTimer = null;
      entry?.grab_focus();
    });
  });

  onCleanup(() => {
    unsubscribe();
    focusTimer?.cancel();
    focusTimer = null;
  });

  return (
    <window
      name={`wifi-password-${connector}`}
      class="WifiPasswordDialog"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.TOP}
      anchor={
        Astal.WindowAnchor.TOP |
        Astal.WindowAnchor.BOTTOM |
        Astal.WindowAnchor.LEFT |
        Astal.WindowAnchor.RIGHT
      }
      keymode={Astal.Keymode.EXCLUSIVE}
      application={app}
      visible={state.visible}
    >
      <Gtk.EventControllerKey
        onKeyPressed={(_, keyval) => {
          if (keyval !== Gdk.KEY_Escape) return false;

          state.close();
          return true;
        }}
      />
      <box hexpand vexpand>
        <box
          class="cc-modal cc-password-modal"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={scaleUiSize(12)}
          halign={Gtk.Align.START}
          valign={Gtk.Align.CENTER}
          widthRequest={scaleUiSize(320)}
          marginStart={scaleUiSize(100)}
        >
          <box spacing={scaleUiSize(8)}>
            <LucideIcon name="wifi" pixelSize={18} />
            <label label="Connect to Wi-Fi" class="cc-modal-title" />
          </box>
          <label
            label={state.ssid}
            halign={Gtk.Align.START}
            ellipsize={Pango.EllipsizeMode.END}
            maxWidthChars={32}
          />
          <entry
            class="cc-password-entry"
            placeholderText="Password"
            visibility={false}
            inputPurpose={Gtk.InputPurpose.PASSWORD}
            $={(self: Gtk.Entry) => {
              entry = self;
            }}
            onActivate={submit}
          />
          <label
            label={state.error}
            class="cc-connectivity-error"
            visible={state.error.as(Boolean)}
            wrap
            wrapMode={Pango.WrapMode.WORD_CHAR}
            maxWidthChars={38}
          />
          <box spacing={scaleUiSize(8)} halign={Gtk.Align.END}>
            <button
              class="power-btn cc-modal-action"
              sensitive={state.busy.as(value => !value)}
              onClicked={state.close}
            >
              <label label="Cancel" />
            </button>
            <button
              class="power-btn cc-modal-action cc-primary-btn"
              sensitive={state.busy.as(value => !value)}
              onClicked={submit}
            >
              <label
                label={state.connectLabel}
                ellipsize={Pango.EllipsizeMode.END}
                maxWidthChars={20}
              />
            </button>
          </box>
        </box>
      </box>
    </window>
  );
}
