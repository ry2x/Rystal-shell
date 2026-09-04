import {Gtk} from 'ags/gtk4';

import Apps from 'gi://AstalApps';
import Pango from 'gi://Pango';

import {scaleUiSize} from '@/lib/uiScale';
import {recordAppLaunch} from '@/stores/application/applicationRegistry';
import {toggleAppLauncher} from '@/stores/shell/windowManager';

export interface AppItemProps {
  res: Apps.Application;
  monitorConnector: string | null;
}

function createImageProp(iconStr: string): Partial<Gtk.Image.ConstructorProps> {
  const iconProps: Partial<Gtk.Image.ConstructorProps> = {
    cssClasses: ['applauncher-item-icon'],
  };

  if (iconStr.startsWith('/')) {
    iconProps.file = iconStr;
  } else {
    iconProps.iconName = iconStr;
  }

  return iconProps;
}

export function AppItem({res, monitorConnector}: AppItemProps): Gtk.Button {
  return (
    <button
      class="applauncher-item"
      canFocus={false}
      onClicked={() => {
        toggleAppLauncher(monitorConnector);
        recordAppLaunch(res);
        res.launch();
      }}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={scaleUiSize(12)}>
        <image {...createImageProp(res.iconName)} />
        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
          <label
            label={res.name}
            halign={Gtk.Align.START}
            class="applauncher-item-name"
            ellipsize={Pango.EllipsizeMode.END}
          />
          {res.description && (
            <label
              label={res.description}
              halign={Gtk.Align.START}
              class="applauncher-item-desc"
              ellipsize={Pango.EllipsizeMode.END}
              maxWidthChars={40}
            />
          )}
        </box>
      </box>
    </button>
  ) as Gtk.Button;
}
