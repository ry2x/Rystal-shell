import {Gdk, Gtk} from 'ags/gtk4';
import app from 'ags/gtk4/app';

import {requestHandler} from '@/ipc';
import {rystalShellDataDir, rystalShellInstance} from '@/lib/paths';
import {cleanupRecording} from '@/stores/capture/recording';
import {initCss} from '@/stores/shell/style';
import ShellWindows from '@/widget/ShellWindows';

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

    return <ShellWindows monitors={app.get_monitors()} />;
  },
});
