import { For, createBinding as bind, createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import Bluetooth from 'gi://AstalBluetooth';
import Pango from 'gi://Pango';

import { LucideIcon } from '../../../../lib/lucide';
import { toggleBluetooth } from '../../../../services/network';
import {
  ConfirmOverlay,
  Confirmation,
  DetailMenuButton,
  ErrorLabel,
  PageHeader,
  PageState,
} from './Shared';

export function BluetoothPage({ page, onBack }: { page: PageState; onBack: () => void }) {
  const bluetooth = Bluetooth.get_default();
  const adapter = bluetooth.adapter;
  const [devices, setDevices] = createState<Bluetooth.Device[]>(bluetooth.devices ?? []);
  const [error, setError] = createState('');
  const [confirmation, setConfirmation] = createState<Confirmation | null>(null);
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  if (!adapter) return <label label="No Bluetooth adapter available" class="cc-card" />;

  const refreshDevices = () => setDevices([...(bluetooth.devices ?? [])]);
  const stopDiscovery = () => {
    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = null;
    try {
      adapter.stop_discovery();
    } catch {
      /* Adapter may already have stopped. */
    }
  };
  const discover = () => {
    setError('');
    stopDiscovery();
    try {
      adapter.start_discovery();
      stopTimer = setTimeout(stopDiscovery, 15_000);
    } catch (reason) {
      setError(String(reason));
    }
  };
  const connected = devices.as((list) => list.filter((device) => device.connected));
  const available = devices.as((list) =>
    list.filter((device) => device.paired && !device.connected),
  );

  const content = (
    <box
      class="cc-bluetooth-page"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
      $={(self: Gtk.Box) => {
        const hooks = [
          bluetooth.connect('notify::devices', refreshDevices),
          bluetooth.connect('device-added', refreshDevices),
          bluetooth.connect('device-removed', refreshDevices),
        ];
        const unsubscribePage = page.subscribe(() => {
          if (page() === 'bluetooth') discover();
          else stopDiscovery();
        });
        self.connect('destroy', () => {
          hooks.forEach((hook) => bluetooth.disconnect(hook));
          unsubscribePage();
          stopDiscovery();
        });
      }}
    >
      <PageHeader
        title="Bluetooth"
        enabled={bind(bluetooth, 'is_powered')}
        onToggle={() => toggleBluetooth(bluetooth.is_powered)}
        onBack={onBack}
      />
      <ErrorLabel error={error} />
      <revealer
        revealChild={bind(bluetooth, 'is_powered')}
        transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
          <box class="cc-bt-section-header" spacing={8}>
            <LucideIcon name="link-2" pixelSize={17} />
            <label label="Connected Devices" class="cc-section-title" halign={Gtk.Align.START} />
          </box>
          <box
            class="cc-connectivity-list cc-bt-connected-list"
            orientation={Gtk.Orientation.VERTICAL}
          >
            <For each={connected}>
              {(device: Bluetooth.Device) => (
                <box class="cc-connectivity-row active" spacing={14}>
                  <image class="cc-bt-device-icon" iconName={bind(device, 'icon')} pixelSize={24} />
                  <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                    <label
                      label={bind(device, 'alias')}
                      class="cc-bt-device-name"
                      halign={Gtk.Align.START}
                      ellipsize={Pango.EllipsizeMode.END}
                    />
                    <label
                      label={bind(device, 'battery_percentage').as((value) =>
                        value >= 0 ? `${Math.round(value)}% battery` : 'Connected',
                      )}
                      class="cc-row-subtitle cc-bt-device-detail"
                      halign={Gtk.Align.START}
                    />
                  </box>
                  <DetailMenuButton
                    triggerClass="cc-bt-settings-button"
                    onDisconnect={() =>
                      setConfirmation({
                        title: 'Disconnect Bluetooth device',
                        message: `Disconnect ${device.alias}?`,
                        confirmLabel: 'Disconnect',
                        onConfirm: async () => {
                          await device.disconnect_device(null);
                          refreshDevices();
                        },
                      })
                    }
                    onForget={() =>
                      setConfirmation({
                        title: 'Forget Bluetooth device',
                        message: `Remove the pairing for ${device.alias}?`,
                        confirmLabel: 'Forget',
                        onConfirm: async () => {
                          adapter.remove_device(device);
                          refreshDevices();
                        },
                      })
                    }
                  />
                </box>
              )}
            </For>
          </box>
          <box class="cc-bt-section-header" spacing={8}>
            <LucideIcon name="bluetooth" pixelSize={17} />
            <label label="Available Devices" class="cc-section-title" halign={Gtk.Align.START} />
          </box>
          <box class="cc-connectivity-list" orientation={Gtk.Orientation.VERTICAL}>
            <For each={available}>
              {(device: Bluetooth.Device) => (
                <button
                  class="cc-connectivity-row"
                  onClicked={() => {
                    try {
                      device.connect_device(null);
                      setTimeout(refreshDevices, 500);
                    } catch (reason) {
                      setError(String(reason));
                    }
                  }}
                >
                  <box spacing={14}>
                    <image
                      class="cc-bt-device-icon"
                      iconName={bind(device, 'icon')}
                      pixelSize={24}
                    />
                    <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                      <label
                        label={bind(device, 'alias')}
                        class="cc-bt-device-name"
                        halign={Gtk.Align.START}
                        ellipsize={Pango.EllipsizeMode.END}
                      />
                      <label
                        label={bind(device, 'battery_percentage').as((value) =>
                          value >= 0 ? `${Math.round(value)}% battery` : 'Paired device',
                        )}
                        class="cc-row-subtitle cc-bt-device-detail"
                        halign={Gtk.Align.START}
                      />
                    </box>
                  </box>
                </button>
              )}
            </For>
          </box>
          <button
            class={bind(adapter, 'discovering').as((discovering) =>
              discovering ? 'cc-bt-scan-btn scanning' : 'cc-bt-scan-btn',
            )}
            onClicked={discover}
            sensitive={bind(adapter, 'discovering').as((discovering) => !discovering)}
          >
            <box spacing={8} halign={Gtk.Align.CENTER}>
              <LucideIcon name="refresh-cw" class="cc-bt-scan-icon" pixelSize={16} />
              <label
                label={bind(adapter, 'discovering').as((value) =>
                  value ? 'Scanning…' : 'Refresh',
                )}
              />
            </box>
          </button>
        </box>
      </revealer>
      <label
        label="Bluetooth is turned off"
        visible={bind(bluetooth, 'is_powered').as((value) => !value)}
        class="cc-card"
        halign={Gtk.Align.CENTER}
      />
    </box>
  ) as Gtk.Widget;

  const dialogs = (
    <box hexpand vexpand halign={Gtk.Align.FILL} valign={Gtk.Align.FILL}>
      <For each={confirmation.as((value) => (value ? [value] : []))}>
        {(value: Confirmation) => (
          <ConfirmOverlay
            confirmation={value}
            clear={() => setConfirmation(null)}
            setError={setError}
          />
        )}
      </For>
    </box>
  ) as Gtk.Widget;
  const overlay = new Gtk.Overlay();
  overlay.set_child(content);
  overlay.add_overlay(dialogs);
  const updateDialogTarget = () => dialogs.set_can_target(confirmation() !== null);
  const unsubscribeConfirmation = confirmation.subscribe(updateDialogTarget);
  updateDialogTarget();
  overlay.connect('destroy', unsubscribeConfirmation);
  return overlay;
}
