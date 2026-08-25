export function formatWorldClockTime(date: Date, timeZone: string) {
  return date.toLocaleTimeString('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getTimeZoneName(date: Date, timeZone: string, format: 'short' | 'shortOffset') {
  return (
    new Intl.DateTimeFormat('en-US', {timeZone, timeZoneName: format})
      .formatToParts(date)
      .find(part => part.type === 'timeZoneName')?.value ?? ''
  );
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = new Map(parts.map(part => [part.type, Number(part.value)]));
  const zonedTimestamp = Date.UTC(
    values.get('year') ?? 0,
    (values.get('month') ?? 1) - 1,
    values.get('day') ?? 1,
    values.get('hour') ?? 0,
    values.get('minute') ?? 0,
    values.get('second') ?? 0
  );

  return Math.round((zonedTimestamp - date.getTime()) / 60_000);
}

function formatOffsetMinutes(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  const minuteSuffix = minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : '';

  return `${sign}${hours}${minuteSuffix}h`;
}

export function formatWorldClockLocationDetails(date: Date, timeZone: string) {
  const formattedDate = date.toLocaleDateString('en-US', {
    timeZone,
    month: 'short',
    day: '2-digit',
  });
  const abbreviation = getTimeZoneName(date, timeZone, 'short');

  return `${formattedDate} | ${abbreviation}`;
}

export function formatWorldClockOffset(date: Date, timeZone: string) {
  const targetOffsetMinutes = getTimeZoneOffsetMinutes(date, timeZone);
  const localOffsetMinutes = -date.getTimezoneOffset();

  return formatOffsetMinutes(targetOffsetMinutes - localOffsetMinutes);
}
