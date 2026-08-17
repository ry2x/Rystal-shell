import {type Accessor, For, createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Bluetooth from 'gi://AstalBluetooth';

import {
  type BluetoothConfirmation,
  createBluetoothPageState,
} from '@/stores/connectivity/bluetooth';
import {toggleBluetooth} from '@/stores/connectivity/network';
import AnimatedList from '@/widget/common/AnimatedList';
import {LucideIcon} from '@/widget/common/lucide';
import AvailableDeviceRow from '@/widget/control-center/widget/Connectivity/BluetoothPage/AvailableDeviceRow';
import ConnectedDeviceRow from '@/widget/control-center/widget/Connectivity/BluetoothPage/ConnectedDeviceRow';
import {
  ConfirmOverlay,
  ErrorLabel,
  PageHeader,
} from '@/widget/control-center/widget/Connectivity/Shared';
import {type ControlCenterPage} from '@/widget/control-center/widget/Connectivity/Shared';

export interface BluetoothPageProps {
  page: Accessor<ControlCenterPage>;
  onBack: () => void;
}

export function BluetoothPage({page, onBack}: BluetoothPageProps) {
  const state = createBluetoothPageState(page.as(value => value === 'bluetooth'));
  const {bluetooth, adapter} = state;

  if (!adapter) return <label label="No Bluetooth adapter available" class="cc-card" />;

  const content = (
    <box
      class="cc-bluetooth-page"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <PageHeader
        title="Bluetooth"
        enabled={createBinding(bluetooth, 'is_powered')}
        onToggle={() => toggleBluetooth(bluetooth.is_powered)}
        onBack={onBack}
      />
      <ErrorLabel error={state.error} />
      <revealer
        revealChild={createBinding(bluetooth, 'is_powered')}
        transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
          <box class="cc-bt-section-header" spacing={8}>
            <LucideIcon name="link-2" pixelSize={17} />
            <label label="Connected Devices" class="cc-section-title" halign={Gtk.Align.START} />
          </box>
          <AnimatedList
            className="cc-connectivity-list cc-bt-connected-list"
            items={state.connectedDevices}
            idFor={(device: Bluetooth.Device) => device.address}
            renderItem={(device: Bluetooth.Device) => (
              <ConnectedDeviceRow
                device={device}
                onDisconnect={() => state.requestDisconnect(device)}
                onForget={() => state.requestForget(device)}
              />
            )}
          />
          <box class="cc-bt-section-header" spacing={8}>
            <LucideIcon name="bluetooth" pixelSize={17} />
            <label label="Available Devices" class="cc-section-title" halign={Gtk.Align.START} />
          </box>
          <AnimatedList
            className="cc-connectivity-list"
            items={state.availableDevices}
            idFor={(device: Bluetooth.Device) => device.address}
            renderItem={(device: Bluetooth.Device) => (
              <AvailableDeviceRow
                device={device}
                onConnect={() => void state.connectDevice(device)}
              />
            )}
          />
          <button
            class={createBinding(adapter, 'discovering').as(discovering =>
              discovering ? 'cc-bt-scan-btn scanning' : 'cc-bt-scan-btn'
            )}
            onClicked={state.discover}
            sensitive={createBinding(adapter, 'discovering').as(discovering => !discovering)}
          >
            <box spacing={8} halign={Gtk.Align.CENTER}>
              <LucideIcon name="refresh-cw" class="cc-bt-scan-icon" pixelSize={16} />
              <label
                label={createBinding(adapter, 'discovering').as(discovering =>
                  discovering ? 'Scanning…' : 'Refresh'
                )}
              />
            </box>
          </button>
        </box>
      </revealer>
      <label
        label="Bluetooth is turned off"
        visible={createBinding(bluetooth, 'is_powered').as(value => !value)}
        class="cc-card"
        halign={Gtk.Align.CENTER}
      />
    </box>
  ) as Gtk.Widget;

  return (
    <overlay>
      {content}
      <box
        $type="overlay"
        canTarget={state.confirmation.as(Boolean)}
        hexpand
        vexpand
        halign={Gtk.Align.FILL}
        valign={Gtk.Align.FILL}
      >
        <For each={state.confirmation.as(value => (value ? [value] : []))}>
          {(confirmation: BluetoothConfirmation) => (
            <ConfirmOverlay
              confirmation={confirmation}
              clear={state.clearConfirmation}
              setError={state.setError}
            />
          )}
        </For>
      </box>
    </overlay>
  );
}
