import {createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Network from 'gi://AstalNetwork';
import Pango from 'gi://Pango';

import {scaleUiSize} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';
import {
  getSignalLabel,
  getSsidLabel,
} from '@/widget/control-center/widget/Connectivity/WifiPage/utils';

export interface AvailableNetworkRowProps {
  accessPoint: Network.AccessPoint;
  onSelect: () => void;
}

export default function AvailableNetworkRow({accessPoint, onSelect}: AvailableNetworkRowProps) {
  return (
    <button class="cc-connectivity-row" onClicked={onSelect}>
      <box spacing={scaleUiSize(14)}>
        <image
          class="cc-wifi-network-icon"
          iconName={createBinding(accessPoint, 'icon_name')}
          pixelSize={scaleUiSize(24)}
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
        <button
          class="icon-btn cc-wifi-security"
          visible={createBinding(accessPoint, 'requires_password')}
          widthRequest={scaleUiSize(44)}
          hexpand={false}
          canFocus={false}
        >
          <LucideIcon name="lock" pixelSize={16} />
        </button>
      </box>
    </button>
  );
}
