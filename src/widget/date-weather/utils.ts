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
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: format })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? ''
  );
}

export function formatWorldClockDetails(date: Date, timeZone: string) {
  const formattedDate = date.toLocaleDateString('en-US', {
    timeZone,
    month: 'short',
    day: '2-digit',
  });
  const offset = getTimeZoneName(date, timeZone, 'shortOffset').replace('GMT', '') || '+0';
  const abbreviation = getTimeZoneName(date, timeZone, 'short');

  return `${formattedDate} | ${offset}h | ${abbreviation}`;
}
