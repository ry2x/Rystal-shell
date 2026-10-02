import Gio from 'gi://Gio?version=2.0';

import {type BatteryData, parseBatteryProperties} from '@/lib/battery';
import {createLazyAccessor} from '@/stores/common/lazyAccessor';

function readBattery(proxy: Gio.DBusProxy): BatteryData | null {
  if (!proxy.get_name_owner()) return null;
  return parseBatteryProperties({
    Type: proxy.get_cached_property('Type')?.unpack(),
    IsPresent: proxy.get_cached_property('IsPresent')?.unpack(),
    Percentage: proxy.get_cached_property('Percentage')?.unpack(),
    State: proxy.get_cached_property('State')?.unpack(),
  });
}

/** One asynchronous UPower subscription shared by all metrics, released with the last observer. */
export const batteryState = createLazyAccessor<BatteryData | null>(null, setBattery => {
  const cancellable = new Gio.Cancellable();
  let proxy: Gio.DBusProxy | null = null;
  let signals: number[] = [];
  let disposed = false;
  setBattery(null);

  Gio.DBusProxy.new_for_bus(
    Gio.BusType.SYSTEM,
    Gio.DBusProxyFlags.GET_INVALIDATED_PROPERTIES,
    null,
    'org.freedesktop.UPower',
    '/org/freedesktop/UPower/devices/DisplayDevice',
    'org.freedesktop.UPower.Device',
    cancellable,
    (_source, result) => {
      try {
        const ready = Gio.DBusProxy.new_for_bus_finish(result);
        if (disposed) return;
        proxy = ready;
        const update = () => setBattery(readBattery(ready));
        signals = [
          ready.connect('g-properties-changed', update),
          ready.connect('notify::g-name-owner', update),
        ];
        update();
      } catch (error) {
        if (!disposed) {
          setBattery(null);
          console.warn('Battery information is unavailable:', error);
        }
      }
    }
  );

  return () => {
    if (disposed) return;
    disposed = true;
    cancellable.cancel();
    signals.forEach(signal => proxy?.disconnect(signal));
    signals = [];
    proxy = null;
  };
});
