import {For, createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Network from 'gi://AstalNetwork';

import {toggleWifi} from '@/stores/connectivity/network';
import {type WifiConfirmation, createWifiPageState} from '@/stores/connectivity/wifiPage';
import AnimatedList from '@/widget/common/AnimatedList';
import EmptyState from '@/widget/common/EmptyState';
import {LucideIcon} from '@/widget/common/lucide';
import {
  ConfirmOverlay,
  ErrorLabel,
  PageHeader,
} from '@/widget/control-center/widget/Connectivity/Shared';
import AvailableNetworkRow from '@/widget/control-center/widget/Connectivity/WifiPage/AvailableNetworkRow';
import ConnectedNetworkRow from '@/widget/control-center/widget/Connectivity/WifiPage/ConnectedNetworkRow';
import {getAccessPointId} from '@/widget/control-center/widget/Connectivity/WifiPage/utils';

export interface WifiPageProps {
  monitorConnector: string;
  onBack: () => void;
}

export function WifiPage({monitorConnector, onBack}: WifiPageProps) {
  const state = createWifiPageState(monitorConnector);
  const {wifi} = state;

  if (!wifi) {
    return <EmptyState icon="wifi-off" label="No Wi-Fi adapter available" />;
  }

  const content = (
    <box
      class="cc-wifi-page"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
      hexpand
      halign={Gtk.Align.FILL}
    >
      <PageHeader
        title="Wi-Fi"
        enabled={createBinding(wifi, 'enabled')}
        onToggle={() => toggleWifi(wifi.enabled)}
        onBack={onBack}
        className="cc-wifi-header"
      />
      <ErrorLabel error={state.error} onRetry={state.retryPassword} />
      <revealer
        revealChild={createBinding(wifi, 'enabled')}
        transitionType={Gtk.RevealerTransitionType.CROSSFADE}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
          <box class="cc-wifi-section-header" spacing={8}>
            <LucideIcon name="link-2" pixelSize={17} />
            <label label="Connected" class="cc-section-title" hexpand halign={Gtk.Align.START} />
          </box>
          <AnimatedList
            className="cc-connectivity-list cc-wifi-connected-list"
            items={state.activeAccessPoint.as(accessPoint => (accessPoint ? [accessPoint] : []))}
            idFor={(accessPoint: Network.AccessPoint) => getAccessPointId(accessPoint, 'active')}
            renderItem={(accessPoint: Network.AccessPoint) => (
              <ConnectedNetworkRow
                accessPoint={accessPoint}
                onDisconnect={() => state.requestDisconnect(accessPoint)}
                onForget={() => state.requestForget(accessPoint)}
              />
            )}
          />
          <label
            label="Not connected"
            class="cc-row-subtitle"
            visible={state.activeAccessPoint.as(accessPoint => !accessPoint)}
            halign={Gtk.Align.START}
          />
          <box class="cc-wifi-section-header" spacing={8}>
            <LucideIcon name="wifi" pixelSize={17} />
            <label label="Available Networks" class="cc-section-title" halign={Gtk.Align.START} />
          </box>
          <AnimatedList
            className="cc-connectivity-list"
            items={state.availableAccessPoints}
            idFor={(accessPoint: Network.AccessPoint) => getAccessPointId(accessPoint, 'network')}
            renderItem={(accessPoint: Network.AccessPoint) => (
              <AvailableNetworkRow
                accessPoint={accessPoint}
                onSelect={() => void state.selectAccessPoint(accessPoint)}
              />
            )}
          />
          <button
            class={createBinding(wifi, 'scanning').as(scanning =>
              scanning ? 'cc-wifi-scan-btn scanning' : 'cc-wifi-scan-btn'
            )}
            onClicked={state.scan}
            sensitive={createBinding(wifi, 'scanning').as(scanning => !scanning)}
          >
            <box spacing={8} halign={Gtk.Align.CENTER}>
              <LucideIcon name="refresh-cw" class="cc-wifi-scan-icon" pixelSize={16} />
              <label
                label={createBinding(wifi, 'scanning').as(scanning =>
                  scanning ? 'Scanning…' : 'Scan networks'
                )}
              />
            </box>
          </button>
        </box>
      </revealer>
      <EmptyState
        icon="wifi-off"
        label="Wi-Fi is turned off"
        visible={createBinding(wifi, 'enabled').as(value => !value)}
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
          {(confirmation: WifiConfirmation) => (
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
