import {Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {requestHandler} from '@/ipc';
import {appConfig} from '@/lib/config';
import {rystalShellDataDir, rystalShellInstance} from '@/lib/paths';
import {createUiScaleContext} from '@/lib/uiScale';
import {cleanupRecording} from '@/stores/capture/recording';
import {initCss} from '@/stores/shell/style';
import AppLauncher from '@/widget/app-launcher';
import Bar from '@/widget/bar';
import ControlCenter from '@/widget/control-center';
import WifiPasswordDialog from '@/widget/control-center/widget/Connectivity/WifiPasswordDialog';
import DateWeatherPopup from '@/widget/date-weather';
import NotificationPopups from '@/widget/notification-popups';
import PowerMenu from '@/widget/power-menu';
import WallpaperSelector from '@/widget/wallpaper-selector';

app.start({
  instanceName: rystalShellInstance,
  requestHandler,
  main() {
    app.connect('shutdown', () => {
      cleanupRecording();
    });
    initCss();

    // Add lucide symbolic icons to GTK Icon Theme search path
    const display = Gdk.Display.get_default();
    if (display) {
      Gtk.IconTheme.get_for_display(display).add_search_path(`${rystalShellDataDir}/assets/icons`);
    }

    app.get_monitors().forEach(m => {
      const uiScale = createUiScaleContext(m.get_connector(), appConfig.ui);
      Bar({monitor: m, uiScale});
      ControlCenter({monitor: m, uiScale});
      WifiPasswordDialog({monitor: m, uiScale});
      DateWeatherPopup({monitor: m, uiScale});
      NotificationPopups({monitor: m, uiScale});
      AppLauncher({monitor: m, uiScale});
      WallpaperSelector({monitor: m, uiScale});
      PowerMenu({monitor: m, uiScale});
    });
  },
});
