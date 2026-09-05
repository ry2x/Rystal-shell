import {type Accessor, onCleanup} from 'ags';
import {Gtk} from 'ags/gtk4';

import Pango from 'gi://Pango';

import {scaleUiSize} from '@/lib/uiScale';
import {openLauncherQuery} from '@/stores/application/appLauncherAction';
import {getDirectUrl} from '@/stores/application/appLauncherAction';

export interface SearchGoogleBtnProps {
  textState: Accessor<string>;
  monitorConnector: string | null;
  register: (button: Gtk.Button | null) => void;
}

export function SearchGoogleBtn({textState, monitorConnector, register}: SearchGoogleBtnProps) {
  onCleanup(() => register(null));

  return (
    <button
      class="applauncher-item"
      canFocus={false}
      visible={textState.as((t: string) => (t || '').trim() !== '')}
      $={register}
      onClicked={() => {
        const t = textState.peek() || '';
        openLauncherQuery(t, monitorConnector);
      }}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={scaleUiSize(12)}>
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
  );
}
