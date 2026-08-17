import {Gtk} from 'ags/gtk4';

import RecordingActions from '@/widget/control-center/widget/ScreenCapture/RecordingActions';
import ScreenshotActions from '@/widget/control-center/widget/ScreenCapture/ScreenshotActions';

export default function ScreenCapture() {
  return (
    <box class="cc-card" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <ScreenshotActions />
      <RecordingActions />
    </box>
  );
}
