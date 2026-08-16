import {createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Network from 'gi://AstalNetwork';
import Pango from 'gi://Pango';

import {LucideIcon} from '../../../../common/lucide';
import {getSignalLabel, getSsidLabel} from './utils';

export interface AvailableNetworkRowProps {
  accessPoint: Network.AccessPoint;
  onSelect: () => void;
}

export default function AvailableNetworkRow({accessPoint, onSelect}: AvailableNetworkRowProps) {
  return (
    <button class="cc-connectivity-row" onClicked={onSelect}>
      <box spacing={14}>
        <image
          class="cc-wifi-network-icon"
          iconName={createBinding(accessPoint, 'icon_name')}
          pixelSize={24}
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
          widthRequest={44}
          hexpand={false}
          canFocus={false}
        >
          <LucideIcon name="lock" pixelSize={16} />
        </button>
      </box>
    </button>
  );
}
