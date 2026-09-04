import {createState} from 'ags';

import Apps from 'gi://AstalApps';

import {ApplicationHistory} from './applicationHistory';

const MAX_APP_RESULTS = 30;

interface ApplicationRegistry {
  applications: Apps.Apps;
  history: ApplicationHistory;
}

let applicationRegistry: ApplicationRegistry | null = null;

const [applicationRegistryRevisionState, setApplicationRegistryRevision] = createState(0);
const [applicationHistoryRevisionState, setApplicationHistoryRevision] = createState(0);

export const applicationRegistryRevision = applicationRegistryRevisionState;
export const applicationHistoryRevision = applicationHistoryRevisionState;

function getApplicationRegistry() {
  if (applicationRegistry) return applicationRegistry;

  const applications = new Apps.Apps();
  applications.connect('notify::list', () => {
    setApplicationRegistryRevision(revision => revision + 1);
  });
  applicationRegistry = {
    applications,
    history: new ApplicationHistory(applications),
  };
  return applicationRegistry;
}

function getResultKey(application: Apps.Application) {
  return application.name + (application.description || '') + (application.iconName || '');
}

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

function getApplicationList() {
  const {applications, history} = getApplicationRegistry();
  return applications.get_list().sort((applicationA, applicationB) => {
    const scoreA = history.getScore(applicationA);
    const scoreB = history.getScore(applicationB);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (applicationA.name || '').localeCompare(applicationB.name || '');
  });
}

export function recordAppLaunch(application: Apps.Application) {
  getApplicationRegistry().history.recordLaunch(application);
  setApplicationHistoryRevision(revision => revision + 1);
}

export function searchApps(query: string) {
  const {history} = getApplicationRegistry();
  const allApplications = getApplicationList();
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
