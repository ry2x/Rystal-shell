import {type Accessor, For, createBinding} from 'ags';
import {Gtk} from 'ags/gtk4';

import Wp from 'gi://AstalWp';
import Pango from 'gi://Pango';

import {scaleUiSize} from '@/lib/uiScale';
import {LucideIcon} from '@/widget/common/lucide';
import {type SoundDeviceKind} from '@/widget/control-center/widget/Sound/types';
import {getEndpointLabel, getRouteLabel} from '@/widget/control-center/widget/Sound/utils';

export interface DeviceSelectorProps {
  endpoint: Wp.Endpoint;
  endpoints: Accessor<Wp.Endpoint[]>;
  kind: SoundDeviceKind;
  onSelect: (endpoint: Wp.Endpoint) => void | Promise<void>;
}

export default function DeviceSelector({endpoint, endpoints, kind, onSelect}: DeviceSelectorProps) {
  const route = createBinding(endpoint, 'route').as(() => getRouteLabel(endpoint));
  const button = (
    <button class="cc-sound-device-card" hexpand halign={Gtk.Align.FILL}>
      <box spacing={scaleUiSize(14)} hexpand>
        <LucideIcon name={kind === 'output' ? 'speaker' : 'mic'} pixelSize={26} />
        <box orientation={Gtk.Orientation.VERTICAL} hexpand valign={Gtk.Align.CENTER}>
          <label
            label={getEndpointLabel(endpoint)}
            class="cc-sound-device-name"
            halign={Gtk.Align.START}
            ellipsize={Pango.EllipsizeMode.END}
            maxWidthChars={30}
            lines={1}
          />
          <label
            label={route}
            visible={route.as(Boolean)}
            class="cc-sound-device-route"
            halign={Gtk.Align.START}
            ellipsize={Pango.EllipsizeMode.END}
            maxWidthChars={30}
            lines={1}
          />
        </box>
        <LucideIcon name="chevron-down" class="cc-sound-device-chevron" pixelSize={20} />
      </box>
    </button>
  ) as Gtk.Button;

  const popover = new Gtk.Popover({
    hasArrow: false,
    cssClasses: ['cc-sound-device-menu'],
  });

  popover.set_parent(button);
  popover.set_child(
    (
      <box orientation={Gtk.Orientation.VERTICAL} spacing={scaleUiSize(2)}>
        <For each={endpoints}>
          {(candidate: Wp.Endpoint) => (
            <button
              class={createBinding(candidate, 'is_default').as(active =>
                active ? 'cc-sound-device-option active' : 'cc-sound-device-option'
              )}
              tooltipText={candidate.name || undefined}
              onClicked={() => {
                popover.popdown();
                void Promise.resolve(onSelect(candidate)).catch(console.error);
              }}
            >
              <box spacing={scaleUiSize(10)}>
                <LucideIcon name={kind === 'output' ? 'speaker' : 'mic'} pixelSize={18} />
                <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                  <label
                    label={getEndpointLabel(candidate)}
                    halign={Gtk.Align.START}
                    ellipsize={Pango.EllipsizeMode.END}
                    maxWidthChars={30}
                    lines={1}
                  />
                  <label
                    label={getRouteLabel(candidate)}
                    visible={Boolean(getRouteLabel(candidate))}
                    class="cc-sound-device-option-route"
                    halign={Gtk.Align.START}
                    ellipsize={Pango.EllipsizeMode.END}
                    maxWidthChars={30}
                    lines={1}
                  />
                </box>
                <LucideIcon
                  name="check"
                  class="cc-sound-device-check"
                  visible={createBinding(candidate, 'is_default')}
                  pixelSize={17}
                />
              </box>
            </button>
          )}
        </For>
      </box>
    ) as Gtk.Widget
  );

  button.connect('clicked', () => popover.popup());
  button.connect('destroy', () => {
    popover.popdown();
    if (popover.get_parent()) popover.unparent();
  });

  return button;
}
