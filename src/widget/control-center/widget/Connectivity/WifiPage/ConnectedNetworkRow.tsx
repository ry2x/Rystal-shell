import {createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Network from 'gi://AstalNetwork';
import Pango from 'gi://Pango';

import {type UiScaleContext} from '@/lib/uiScale';
import {DetailMenuButton} from '@/widget/control-center/widget/Connectivity/Shared';
import {
  getSignalLabel,
  getSsidLabel,
} from '@/widget/control-center/widget/Connectivity/WifiPage/utils';

export interface ConnectedNetworkRowProps {
  accessPoint: Network.AccessPoint;
  onDisconnect: () => void;
  onForget: () => void;
  uiScale: UiScaleContext;
}

export default function ConnectedNetworkRow({
  accessPoint,
  onDisconnect,
  onForget,
  uiScale,
}: ConnectedNetworkRowProps) {
  return (
    <box class="cc-connectivity-row active" spacing={uiScale.size(14)}>
      <image
        class="cc-wifi-network-icon"
        iconName={createBinding(accessPoint, 'icon_name')}
        pixelSize={uiScale.size(26)}
      />
      <box orientation={Gtk.Orientation.VERTICAL} hexpand>
        <label
          label={createBinding(accessPoint, 'ssid').as(getSsidLabel)}
          class="cc-wifi-ssid"
          halign={Gtk.Align.START}
          ellipsize={Pango.EllipsizeMode.END}
        />
        <label
          label={createBinding(accessPoint, 'strength').as(strength =>
            getSignalLabel(accessPoint, strength)
          )}
          class="cc-row-subtitle cc-wifi-signal"
          halign={Gtk.Align.START}
          ellipsize={Pango.EllipsizeMode.END}
        />
      </box>
      <DetailMenuButton
        triggerClass="cc-wifi-settings-button"
        forgetLabel="Forget network"
        onDisconnect={onDisconnect}
        onForget={onForget}
        uiScale={uiScale}
      />
    </box>
  );
}
