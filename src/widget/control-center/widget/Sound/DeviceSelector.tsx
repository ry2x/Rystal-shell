import { For, createBinding as bind, createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import Wp from 'gi://AstalWp';
import Pango from 'gi://Pango';

import { LucideIcon } from '../../../../widget/common/lucide';

type EndpointList = ReturnType<typeof createState<Wp.Endpoint[]>>[0];

function endpointLabel(endpoint: Wp.Endpoint) {
  return endpoint.description || endpoint.name || 'Unknown device';
}

function routeLabel(endpoint: Wp.Endpoint) {
  return endpoint.route?.description || endpoint.route?.name || '';
}

export function DeviceSelector({
  endpoint,
  endpoints,
  kind,
  onSelect,
}: {
  endpoint: Wp.Endpoint;
  endpoints: EndpointList;
  kind: 'output' | 'input';
  onSelect: (endpoint: Wp.Endpoint) => void | Promise<void>;
}) {
  const button = (
    <button class="cc-sound-device-card" hexpand halign={Gtk.Align.FILL}>
      <box spacing={14} hexpand>
        <LucideIcon name={kind === 'output' ? 'speaker' : 'mic'} pixelSize={26} />
        <box orientation={Gtk.Orientation.VERTICAL} hexpand valign={Gtk.Align.CENTER}>
          <label
            label={endpointLabel(endpoint)}
            class="cc-sound-device-name"
            halign={Gtk.Align.START}
            ellipsize={Pango.EllipsizeMode.END}
            maxWidthChars={30}
            lines={1}
          />
          <label
            label={bind(endpoint, 'route').as((route) => route?.description || route?.name || '')}
            visible={bind(endpoint, 'route').as((route) =>
              Boolean(route?.description || route?.name),
            )}
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

  const popover = new Gtk.Popover();
  popover.set_parent(button);
  popover.set_has_arrow(false);
  popover.add_css_class('cc-sound-device-menu');
  popover.set_child(
    (
      <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
        <For each={endpoints}>
          {(candidate: Wp.Endpoint) => (
            <button
              class={bind(candidate, 'is_default').as((active) =>
                active ? 'cc-sound-device-option active' : 'cc-sound-device-option',
              )}
              tooltipText={candidate.name || undefined}
              onClicked={() => {
                popover.popdown();
                void Promise.resolve(onSelect(candidate)).catch(console.error);
              }}
            >
              <box spacing={10}>
                <LucideIcon name={kind === 'output' ? 'speaker' : 'mic'} pixelSize={18} />
                <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                  <label
                    label={endpointLabel(candidate)}
                    halign={Gtk.Align.START}
                    ellipsize={Pango.EllipsizeMode.END}
                    maxWidthChars={30}
                    lines={1}
                  />
                  <label
                    label={routeLabel(candidate)}
                    visible={Boolean(routeLabel(candidate))}
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
                  visible={bind(candidate, 'is_default')}
                  pixelSize={17}
                />
              </box>
            </button>
          )}
        </For>
      </box>
    ) as Gtk.Widget,
  );

  button.connect('clicked', () => popover.popup());
  button.connect('destroy', () => {
    popover.popdown();
    if (popover.get_parent()) popover.unparent();
  });

  return button;
}
