import { Gtk } from 'ags/gtk4';

import RecordingActions from './RecordingActions';
import ScreenshotActions from './ScreenshotActions';

export default function ScreenCapture() {
  return (
    <box class="cc-card" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <ScreenshotActions />
      <RecordingActions />
    </box>
  );
}
