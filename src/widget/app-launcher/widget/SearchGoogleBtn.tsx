import type {Accessor} from 'ags';
import {Gtk} from 'ags/gtk4';

import Pango from 'gi://Pango';

import {type UiScaleContext} from '@/lib/uiScale';
import {getDirectUrl, openQuery} from '@/stores/application/query';
import {toggleAppLauncher} from '@/stores/shell/windowManager';

export interface SearchGoogleBtnProps {
  textState: Accessor<string>;
  monitorConnector: string | null;
  uiScale: UiScaleContext;
}

export function SearchGoogleBtn({
  textState,
  monitorConnector,
  uiScale,
}: SearchGoogleBtnProps): Gtk.Button {
  return (
    <button
      class="applauncher-item"
      canFocus={false}
      visible={textState.as((t: string) => (t || '').trim() !== '')}
      onClicked={() => {
        const t = textState.peek() || '';
        toggleAppLauncher(monitorConnector);
        openQuery(t);
      }}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={uiScale.size(12)}>
        <image iconName="web-browser" class="applauncher-item-icon" />
        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
          <label
            label={textState.as((t: string) =>
              getDirectUrl(t || '') ? `Open "${t || ''}"` : `Search "${t || ''}"`
            )}
            halign={Gtk.Align.START}
            class="applauncher-item-name"
            ellipsize={Pango.EllipsizeMode.END}
          />
          <label
            label={textState.as((t: string) =>
              getDirectUrl(t || '') ? 'Open URL' : 'Search on Google'
            )}
            halign={Gtk.Align.START}
            class="applauncher-item-desc"
          />
        </box>
      </box>
    </button>
  ) as Gtk.Button;
}
