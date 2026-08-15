import { For, createBinding as bind, createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import Network from 'gi://AstalNetwork';
import GObject from 'gi://GObject';
import NM from 'gi://NM';
import Pango from 'gi://Pango';

import { toggleWifi } from '../../../../stores/network';
import {
  connectWifi,
  deleteWifiProfiles,
  getWifiProfileDuplicates,
  hasWifiProfile,
  listWifiAccessPoints,
} from '../../../../stores/wifi';
import { openWifiPasswordDialog } from '../../../../stores/wifiPasswordDialog';
import { LucideIcon } from '../../../../widget/common/lucide';
import AnimatedList from '../../../common/AnimatedList';
import { ConfirmOverlay, DetailMenuButton, ErrorLabel, PageHeader } from './Shared';
import { type Confirmation } from './Shared';

export function WifiPage({
  monitorConnector,
  onBack,
}: {
  monitorConnector: string;
  onBack: () => void;
}) {
  const network = Network.get_default();
  const wifi = network.wifi;
  const [accessPoints, setAccessPoints] = createState<Network.AccessPoint[]>(
    wifi?.access_points ?? [],
  );
  const [error, setError] = createState('');
  const [confirmation, setConfirmation] = createState<Confirmation | null>(null);
  const [retryAccessPoint, setRetryAccessPoint] = createState<Network.AccessPoint | null>(null);
  const [pendingAccessPoint, setPendingAccessPoint] = createState<Network.AccessPoint | null>(null);

  if (!wifi) return <label label="No Wi-Fi adapter available" class="cc-card" />;

  const refreshAccessPoints = () => setAccessPoints(listWifiAccessPoints(wifi));
  const scan = () => {
    setError('');
    wifi.scan();
    refreshAccessPoints();
  };
  const deactivateWifi = () =>
    new Promise<void>((resolve, reject) => {
      try {
        wifi.deactivate_connection((_source, result) => {
          try {
            wifi.deactivate_connection_finish(result);
            resolve();
          } catch (reason) {
            reject(reason);
          }
        });
      } catch (reason) {
        reject(reason);
      }
    });
  const connect = async (ap: Network.AccessPoint, password?: string) => {
    setError('');
    setRetryAccessPoint(null);
    setPendingAccessPoint(ap);
    await connectWifi(network, wifi, ap, password);
    refreshAccessPoints();
  };
  const requestPassword = (ap: Network.AccessPoint) =>
    openWifiPasswordDialog({
      monitor: monitorConnector,
      ssid: ap.ssid || 'network',
      submit: (password) => connect(ap, password),
    });
  const selectAccessPoint = async (ap: Network.AccessPoint) => {
    try {
      const duplicates = getWifiProfileDuplicates(network, ap);
      if (duplicates.length) {
        setConfirmation({
          title: 'Clean up duplicate Wi-Fi profiles',
          message: `Keep ${ap.ssid || 'this network'} and remove: ${duplicates.map((item) => item.id).join(', ')}?`,
          confirmLabel: 'Remove and connect',
          onConfirm: async () => {
            await deleteWifiProfiles(duplicates);
            await connect(ap);
          },
        });
        return;
      }
      if (ap.requires_password && !hasWifiProfile(network, ap)) {
        requestPassword(ap);
        return;
      }
      await connect(ap);
    } catch (reason) {
      setError(String(reason));
      setRetryAccessPoint(ap);
    }
  };
  const active = accessPoints.as(() => wifi.active_access_point);
  const available = accessPoints.as((aps) => aps.filter((ap) => ap !== wifi.active_access_point));

  const content = (
    <box
      class="cc-wifi-page"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
      hexpand
      halign={Gtk.Align.FILL}
      $={(self: Gtk.Box) => {
        const hooks = [
          wifi.connect('notify::access-points', refreshAccessPoints),
          wifi.connect('notify::active-access-point', refreshAccessPoints),
          wifi.connect('access-point-added', refreshAccessPoints),
          wifi.connect('access-point-removed', refreshAccessPoints),
        ];
        const deviceHook = wifi.device.connect(
          'state-changed',
          (_device, state: NM.DeviceState) => {
            const pending = pendingAccessPoint();
            if (!pending) return;
            if (state === NM.DeviceState.ACTIVATED) {
              setPendingAccessPoint(null);
            } else if (state === NM.DeviceState.NEED_AUTH || state === NM.DeviceState.FAILED) {
              setPendingAccessPoint(null);
              setRetryAccessPoint(pending);
              setError(
                `Could not connect to ${pending.ssid || 'this network'}. Enter the password and retry.`,
              );
            }
          },
        );
        scan();
        self.connect('destroy', () => {
          hooks.forEach((hook) => wifi.disconnect(hook));
          GObject.Object.prototype.disconnect.call(wifi.device, deviceHook);
        });
      }}
    >
      <PageHeader
        title="Wi-Fi"
        enabled={bind(wifi, 'enabled')}
        onToggle={() => toggleWifi(wifi.enabled)}
        onBack={onBack}
        className="cc-wifi-header"
      />
      <ErrorLabel
        error={error}
        onRetry={() => {
          const ap = retryAccessPoint();
          if (ap) requestPassword(ap);
        }}
      />
      <revealer
        revealChild={bind(wifi, 'enabled')}
        transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
          <box class="cc-wifi-section-header" spacing={8}>
            <LucideIcon name="link-2" pixelSize={17} />
            <label label="Connected" class="cc-section-title" hexpand halign={Gtk.Align.START} />
          </box>
          <AnimatedList
            className="cc-connectivity-list cc-wifi-connected-list"
            items={active.as((ap) => (ap ? [ap] : []))}
            idFor={(ap: Network.AccessPoint) => ap.bssid || ap.ssid || 'active'}
            renderItem={(ap: Network.AccessPoint) =>
              (
                <box class="cc-connectivity-row active" spacing={14}>
                  <image
                    class="cc-wifi-network-icon"
                    iconName={bind(ap, 'icon_name')}
                    pixelSize={26}
                  />
                  <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                    <label
                      label={bind(ap, 'ssid').as((ssid) => ssid || 'Hidden Network')}
                      class="cc-wifi-ssid"
                      halign={Gtk.Align.START}
                      ellipsize={Pango.EllipsizeMode.END}
                    />
                    <label
                      label={bind(ap, 'strength').as(
                        (strength) => `${ap.bssid || 'Unknown BSSID'} · ${strength}% signal`,
                      )}
                      class="cc-row-subtitle cc-wifi-signal"
                      halign={Gtk.Align.START}
                      ellipsize={Pango.EllipsizeMode.END}
                    />
                  </box>
                  <DetailMenuButton
                    triggerClass="cc-wifi-settings-button"
                    forgetLabel="Forget network"
                    onDisconnect={() =>
                      setConfirmation({
                        title: 'Disconnect Wi-Fi',
                        message: `Disconnect from ${ap.ssid || 'this network'}?`,
                        confirmLabel: 'Disconnect',
                        onConfirm: deactivateWifi,
                      })
                    }
                    onForget={() =>
                      setConfirmation({
                        title: 'Forget Wi-Fi network',
                        message: `Remove the saved connection for ${ap.ssid || 'this network'}?`,
                        confirmLabel: 'Forget',
                        onConfirm: async () => {
                          const connection = wifi.active_connection?.connection;
                          if (!connection) throw new Error('No saved connection profile was found');
                          await deactivateWifi();
                          await new Promise<void>((resolve, reject) => {
                            connection.delete_async(null, (_source, result) => {
                              try {
                                connection.delete_finish(result);
                                resolve();
                              } catch (reason) {
                                reject(reason);
                              }
                            });
                          });
                          refreshAccessPoints();
                        },
                      })
                    }
                  />
                </box>
              ) as Gtk.Widget
            }
          />
          <label
            label="Not connected"
            class="cc-row-subtitle"
            visible={active.as((ap) => !ap)}
            halign={Gtk.Align.START}
          />
          <box class="cc-wifi-section-header" spacing={8}>
            <LucideIcon name="wifi" pixelSize={17} />
            <label label="Available Networks" class="cc-section-title" halign={Gtk.Align.START} />
          </box>
          <AnimatedList
            className="cc-connectivity-list"
            items={available}
            idFor={(ap: Network.AccessPoint) => ap.bssid || ap.ssid || 'network'}
            renderItem={(ap: Network.AccessPoint) =>
              (
                <button class="cc-connectivity-row" onClicked={() => void selectAccessPoint(ap)}>
                  <box spacing={14}>
                    <image
                      class="cc-wifi-network-icon"
                      iconName={bind(ap, 'icon_name')}
                      pixelSize={24}
                    />
                    <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                      <label
                        label={bind(ap, 'ssid').as((ssid) => ssid || 'Hidden Network')}
                        class="cc-wifi-ssid"
                        halign={Gtk.Align.START}
                        ellipsize={Pango.EllipsizeMode.END}
                      />
                      <label
                        label={bind(ap, 'strength').as(
                          (strength) => `${ap.bssid || 'Unknown BSSID'} · ${strength}% signal`,
                        )}
                        class="cc-row-subtitle cc-wifi-signal"
                        halign={Gtk.Align.START}
                        ellipsize={Pango.EllipsizeMode.END}
                      />
                    </box>
                    <button
                      class="icon-btn cc-wifi-security"
                      visible={bind(ap, 'requires_password')}
                      widthRequest={44}
                      hexpand={false}
                      canFocus={false}
                    >
                      <LucideIcon name="lock" pixelSize={16} />
                    </button>
                  </box>
                </button>
              ) as Gtk.Widget
            }
          />
          <button
            class={bind(wifi, 'scanning').as((scanning) =>
              scanning ? 'cc-wifi-scan-btn scanning' : 'cc-wifi-scan-btn',
            )}
            onClicked={scan}
            sensitive={bind(wifi, 'scanning').as((scanning) => !scanning)}
          >
            <box spacing={8} halign={Gtk.Align.CENTER}>
              <LucideIcon name="refresh-cw" class="cc-wifi-scan-icon" pixelSize={16} />
              <label
                label={bind(wifi, 'scanning').as((scanning) =>
                  scanning ? 'Scanning…' : 'Scan networks',
                )}
              />
            </box>
          </button>
        </box>
      </revealer>
      <label
        label="Wi-Fi is turned off"
        visible={bind(wifi, 'enabled').as((value) => !value)}
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
