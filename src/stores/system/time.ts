import { createExternal } from 'ags';
import { type Timer, timeout } from 'ags/time';

const MINUTE_MS = 60_000;
const now = createExternal(Temporal.Now.zonedDateTimeISO(), (setNow) => {
  let updateTimer: Timer | null = null;

  const scheduleNextMinute = () => {
    const delay = MINUTE_MS - (Date.now() % MINUTE_MS);
    updateTimer = timeout(delay, () => {
      setNow(Temporal.Now.zonedDateTimeISO());
      scheduleNextMinute();
    });
  };

  scheduleNextMinute();
  return () => {
    updateTimer?.cancel();
    updateTimer = null;
  };
});

export const clockTime = now.as(
  (t) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
);

export const clockTz = now.as(
  (t) =>
    new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone: t.timeZoneId })
      .formatToParts(Date.now())
      .find((p) => p.type === 'timeZoneName')?.value ?? '',
);

export const clockDate = now.as((t) =>
  t.toLocaleString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
);

export const clockDay = now.as((t) => t.toLocaleString('en-US', { weekday: 'long' }));

export const shortDate = now.as(
  (t) => `${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')}`,
);

export const shortDay = now.as((t) => t.toLocaleString('en-US', { weekday: 'short' }));
