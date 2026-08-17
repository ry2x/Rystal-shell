import {Astal, Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';
import {type Timer, idle} from 'ags/time';

import Pango from 'gi://Pango';

import {createWifiPasswordDialogState} from '@/stores/connectivity/wifiPasswordDialog';
import {LucideIcon} from '@/widget/common/lucide';

export interface WifiPasswordDialogProps {
  monitor: Gdk.Monitor;
}

export default function WifiPasswordDialog({monitor}: WifiPasswordDialogProps) {
  const connector = monitor.get_connector() ?? '';
  const state = createWifiPasswordDialogState(connector);
  let entry: Gtk.Entry | null = null;

  const submit = () => void state.submit(entry?.get_text() ?? '');

  const win = (
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
      $={(self: Astal.Window) => {
        let focusTimer: Timer | null = null;
        const unsubscribe = state.activation.subscribe(() => {
          entry?.set_text('');
          focusTimer?.cancel();
          focusTimer = idle(() => {
            focusTimer = null;
            entry?.grab_focus();
          });
        });
        self.connect('destroy', () => {
          unsubscribe();
          focusTimer?.cancel();
          focusTimer = null;
        });
      }}
    >
      <box hexpand vexpand>
        <box
          class="cc-modal cc-password-modal"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          halign={Gtk.Align.START}
          valign={Gtk.Align.CENTER}
          widthRequest={320}
          marginStart={100}
        >
          <box spacing={8}>
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
          <box spacing={8} halign={Gtk.Align.END}>
            <button
              class="power-btn"
              sensitive={state.busy.as(value => !value)}
              onClicked={state.close}
            >
              <label label="Cancel" />
            </button>
            <button class="power-btn" sensitive={state.busy.as(value => !value)} onClicked={submit}>
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
  ) as Astal.Window;

  const keyController = new Gtk.EventControllerKey();
  keyController.connect('key-pressed', (_, keyval) => {
    if (keyval === Gdk.KEY_Escape) {
      state.close();
      return true;
    }
    return false;
  });
  win.add_controller(keyController);
  return win;
}
