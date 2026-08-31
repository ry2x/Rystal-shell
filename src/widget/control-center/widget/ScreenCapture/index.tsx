import {Gtk} from 'ags/gtk4';

import {type UiScaleContext} from '@/lib/uiScale';
import RecordingActions from '@/widget/control-center/widget/ScreenCapture/RecordingActions';
import ScreenshotActions from '@/widget/control-center/widget/ScreenCapture/ScreenshotActions';

export interface ScreenCaptureProps {
  uiScale: UiScaleContext;
}
export default function ScreenCapture({uiScale}: ScreenCaptureProps) {
  return (
    <box class="cc-card" orientation={Gtk.Orientation.VERTICAL} spacing={uiScale.size(12)}>
      <ScreenshotActions uiScale={uiScale} />
      <RecordingActions uiScale={uiScale} />
    </box>
  );
}
