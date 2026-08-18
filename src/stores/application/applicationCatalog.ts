import Apps from 'gi://AstalApps';

import {ApplicationHistory} from '@/stores/application/applicationHistory';

const MAX_APP_RESULTS = 30;
const applications = new Apps.Apps();
const history = new ApplicationHistory(applications);

function getResultKey(application: Apps.Application) {
  return application.name + (application.description || '') + (application.iconName || '');
}

/**
 * Filters the provided list of applications to ensure that only unique applications are returned,
 * based on their name, description, and icon name.
 * The results are limited to a maximum number of entries defined by MAX_APP_RESULTS.
 * @param applicationList The list of applications to filter for uniqueness.
 * @returns A list of unique applications, limited to MAX_APP_RESULTS.
 */
function getUniqueResults(applicationList: Apps.Application[]) {
  const results: Apps.Application[] = [];
  const seen = new Set<string>();

  for (const application of applicationList) {
    const key = getResultKey(application);
    if (seen.has(key)) continue;

    seen.add(key);
    results.push(application);
    if (results.length === MAX_APP_RESULTS) break;
  }

  return results;
}

function getSortedAppList() {
  return applications.get_list().sort((applicationA, applicationB) => {
    const scoreA = history.getScore(applicationA);
    const scoreB = history.getScore(applicationB);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (applicationA.name || '').localeCompare(applicationB.name || '');
  });
}

/**
 * Records the launch of an application, updating its score in the history.
 * @param application The application that was launched.
 * @returns void
 */
export function recordAppLaunch(application: Apps.Application) {
  history.recordLaunch(application);
}

/**
 * Searches for applications based on the provided query string,
 * returning a list of matching applications sorted by relevance and launch history.
 * @param query The search query string.
 * @returns A list of applications that match the search query.
 */
export function searchApps(query: string) {
  const allApplications = getSortedAppList();

  if (query === '') return getUniqueResults(allApplications);

  const keywords = query.split(/\s+/);

  const results = allApplications
    .map(application => {
      const name = (application.name || '').toLowerCase();
      const description = (application.description || '').toLowerCase();
      const executable = (application.executable || '').toLowerCase();
      const searchString = `${name} ${description} ${executable}`;

      let score = 0;
      if (name.startsWith(query)) score += 100;
      else if (name.includes(query)) score += 50;
      else if (executable.includes(query)) score += 30;
      else if (description.includes(query)) score += 10;

      if (!keywords.every(keyword => searchString.includes(keyword))) score = 0;
      if (score > 0) score += history.getScore(application) * 10;

      return {application, score};
    })
    .filter(({score}) => score > 0);

  results.sort((resultA, resultB) => resultB.score - resultA.score);
  return getUniqueResults(results.map(({application}) => application));
}
