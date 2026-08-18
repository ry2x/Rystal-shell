import {Gtk} from 'ags/gtk4';

import Apps from 'gi://AstalApps';
import Pango from 'gi://Pango';

import {recordAppLaunch} from '@/stores/application/applicationCatalog';
import {toggleAppLauncher} from '@/stores/shell/windowManager';

export interface AppItemProps {
  app: Apps.Application;
  monitorConnector: string | null;
}

/**
 * Creates a set of properties for a Gtk.Image widget based on the provided icon string.
 * If the icon string is a file path,
 * it sets the 'file' property; otherwise, it sets the 'iconName' property.
 * @param iconStr The icon string, either a file path or an icon name.
 * @returns An object containing the appropriate Gtk.Image properties.
 */
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

export function AppItem({app, monitorConnector}: AppItemProps): Gtk.Button {
  return (
    <button
      class="applauncher-item"
      canFocus={false}
      onClicked={() => {
        toggleAppLauncher(monitorConnector);
        recordAppLaunch(app);
        app.launch();
      }}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
        <image {...createImageProp(app.iconName)} />
        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
          <label
            label={app.name}
            halign={Gtk.Align.START}
            class="applauncher-item-name"
            ellipsize={Pango.EllipsizeMode.END}
          />
          {app.description && (
            <label
              label={app.description}
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
