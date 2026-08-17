import {Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {requestHandler} from '@/ipc';
import {rystalShellDataDir, rystalShellInstance} from '@/lib/paths';
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
      Bar({monitor: m});
      ControlCenter({monitor: m});
      WifiPasswordDialog({monitor: m});
      DateWeatherPopup({monitor: m});
      NotificationPopups({monitor: m});
      AppLauncher({monitor: m});
      WallpaperSelector({monitor: m});
      PowerMenu({monitor: m});
    });
  },
});
