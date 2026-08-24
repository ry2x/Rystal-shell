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
  const offset = getTimeZoneName(date, timeZone, 'shortOffset').replace('GMT', '') || '+0';

  return `${offset}h`;
}
