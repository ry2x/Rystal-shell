import {Gdk} from 'ags/gtk4';

import AppLauncher from '@/widget/app-launcher';
import Bar from '@/widget/bar';
import BarReserve from '@/widget/bar/BarReserve';
import ControlCenter from '@/widget/control-center';
import WifiPasswordDialog from '@/widget/control-center/widget/Connectivity/WifiPasswordDialog';
import DateWeatherPopup from '@/widget/date-weather';
import NotificationPopups from '@/widget/notification-popups';
import PowerMenu from '@/widget/power-menu';
import WallpaperSelector from '@/widget/wallpaper-selector';

export interface ShellWindowsProps {
  monitors: Gdk.Monitor[];
}

export default function ShellWindows({monitors}: ShellWindowsProps) {
  return (
    <>
      {monitors.flatMap(monitor => [
        <BarReserve monitor={monitor} />,
        <Bar monitor={monitor} />,
        <ControlCenter monitor={monitor} />,
        <WifiPasswordDialog monitor={monitor} />,
        <DateWeatherPopup monitor={monitor} />,
        <NotificationPopups monitor={monitor} />,
        <AppLauncher monitor={monitor} />,
        <WallpaperSelector monitor={monitor} />,
        <PowerMenu monitor={monitor} />,
      ])}
    </>
  );
}
