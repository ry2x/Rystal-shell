import { execAsync } from 'ags/process';

const DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;
const HTTP_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

function searchWeb(query: string) {
  execAsync(['xdg-open', `https://google.com/search?q=${encodeURIComponent(query)}`]).catch(
    () => {},
  );
}

export function getDirectUrl(value: string) {
  const query = value.trim();
  if (!query || /\s/.test(query)) return null;

  if (HTTP_URL_PATTERN.test(query)) return query;
  return DOMAIN_PATTERN.test(query) ? `https://${query}` : null;
}

export function openQuery(value: string) {
  const url = getDirectUrl(value);
  if (url) {
    execAsync(['xdg-open', url]).catch(console.error);
    return 'url' as const;
  }
  searchWeb(value);
  return 'search' as const;
}
