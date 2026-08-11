import { createState } from 'ags';
import { Astal, Gdk, Gtk } from 'ags/gtk4';
import app from 'ags/gtk4/app';

import Pango from 'gi://Pango';

import {
  closeWifiPasswordDialog,
  wifiPasswordRequest,
} from '../../../../stores/wifiPasswordDialog';
import { LucideIcon } from '../../../../widget/common/lucide';

export default function WifiPasswordDialog(gdkmonitor: Gdk.Monitor) {
  const connector = gdkmonitor.get_connector() ?? '';
  const [busy, setBusy] = createState(false);
  const [error, setError] = createState('');
  let entry: Gtk.Entry | null = null;

  const submit = async () => {
    const request = wifiPasswordRequest();
    const password = entry?.get_text() ?? '';
    if (!request || request.monitor !== connector || !password) return;

    setBusy(true);
    setError('');
    try {
      await request.submit(password);
      closeWifiPasswordDialog(connector);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };

  const win = (
    <window
      name={`wifi-password-${connector}`}
      class="WifiPasswordDialog"
      gdkmonitor={gdkmonitor}
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
      visible={wifiPasswordRequest.as((request) => request?.monitor === connector)}
      $={(self: Astal.Window) => {
        const unsubscribe = wifiPasswordRequest.subscribe(() => {
          const request = wifiPasswordRequest();
          if (request?.monitor !== connector) return;
          setBusy(false);
          setError('');
          entry?.set_text('');
          setTimeout(() => entry?.grab_focus(), 0);
        });
        self.connect('destroy', unsubscribe);
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
            <label label="Connect to Wi-Fi" css="font-weight: 700; font-size: 1.05em;" />
          </box>
          <label
            label={wifiPasswordRequest.as((request) => request?.ssid ?? '')}
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
            onActivate={() => void submit()}
          />
          <label
            label={error}
            class="cc-connectivity-error"
            visible={error.as(Boolean)}
            wrap
            wrapMode={Pango.WrapMode.WORD_CHAR}
            maxWidthChars={38}
          />
          <box spacing={8} halign={Gtk.Align.END}>
            <button
              class="power-btn"
              sensitive={busy.as((value) => !value)}
              onClicked={() => closeWifiPasswordDialog(connector)}
            >
              <label label="Cancel" />
            </button>
            <button
              class="power-btn"
              sensitive={busy.as((value) => !value)}
              onClicked={() => void submit()}
            >
              <label
                label={wifiPasswordRequest.as((request) =>
                  request ? `Connect to ${request.ssid}` : 'Connect',
                )}
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
      closeWifiPasswordDialog(connector);
      return true;
    }
    return false;
  });
  win.add_controller(keyController);
  return win;
}
