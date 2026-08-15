import { execAsync } from 'ags/process';

import Apps from 'gi://AstalApps';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { ryprlandStateDir } from '../../lib/paths';

const STATE_DIR = `${ryprlandStateDir}/rystal-shell`;
const HISTORY_FILE = `${STATE_DIR}/app-history.json`;
const LEGACY_HISTORY_FILE = `${GLib.get_user_cache_dir()}/ags/app_history.json`;
const MAX_APP_RESULTS = 30;
const MAX_HISTORY_ENTRIES = 100;
const apps = new Apps.Apps();

interface HistoryStore {
  version: 2;
  scores: Record<string, number>;
}

let appHistory: Record<string, number> = {};

function getAppHistoryKey(app: Apps.Application) {
  return app.entry || app.executable || app.name;
}

function getAppResultKey(app: Apps.Application) {
  return app.name + (app.description || '') + (app.iconName || '');
}

function getUniqueAppResults(appList: Apps.Application[]) {
  const results: Apps.Application[] = [];
  const seen = new Set<string>();

  for (const app of appList) {
    const key = getAppResultKey(app);
    if (seen.has(key)) continue;

    seen.add(key);
    results.push(app);
    if (results.length === MAX_APP_RESULTS) break;
  }

  return results;
}

function getRawAppList() {
  return apps.get_list();
}

function trimAppHistory() {
  const entries = Object.entries(appHistory)
    .filter(([, score]) => Number.isFinite(score) && score > 0)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, MAX_HISTORY_ENTRIES);
  appHistory = Object.fromEntries(entries);
}

function loadAppHistory() {
  try {
    const currentFile = Gio.File.new_for_path(HISTORY_FILE);
    const usingLegacyFile = !currentFile.query_exists(null);
    let shouldSave = usingLegacyFile;
    const file = usingLegacyFile ? Gio.File.new_for_path(LEGACY_HISTORY_FILE) : currentFile;
    if (file.query_exists(null)) {
      const [ok, contents] = file.load_contents(null);
      if (ok) {
        const parsed: unknown = JSON.parse(new TextDecoder().decode(contents));
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'version' in parsed &&
          parsed.version === 2 &&
          'scores' in parsed &&
          typeof parsed.scores === 'object' &&
          parsed.scores !== null
        ) {
          appHistory = parsed.scores as Record<string, number>;
        } else if (typeof parsed === 'object' && parsed !== null) {
          const legacy = parsed as Record<string, number>;
          const migrated: Record<string, number> = {};
          for (const [legacyKey, score] of Object.entries(legacy)) {
            const matches = getRawAppList().filter(
              (app) => app.executable === legacyKey || app.name === legacyKey,
            );
            if (matches.length === 1 && Number.isFinite(score)) {
              const key = getAppHistoryKey(matches[0]);
              migrated[key] = (migrated[key] ?? 0) + score;
            }
          }
          appHistory = migrated;
          shouldSave = true;
        }
        trimAppHistory();
        if (shouldSave) saveAppHistory();
      }
    }
  } catch (e) {
    console.error('Failed to load app history', e);
  }
}

function saveAppHistory() {
  try {
    const file = Gio.File.new_for_path(HISTORY_FILE);
    const parent = file.get_parent();
    if (parent && !parent.query_exists(null)) {
      parent.make_directory_with_parents(null);
    }
    const contents = new TextEncoder().encode(
      JSON.stringify({ version: 2, scores: appHistory } satisfies HistoryStore),
    );
    file.replace_contents(contents, null, false, Gio.FileCreateFlags.NONE, null);
  } catch (e) {
    console.error('Failed to save app history', e);
  }
}

export function recordAppLaunch(app: Apps.Application) {
  const key = getAppHistoryKey(app);
  if (!key) return;
  for (const k in appHistory) {
    appHistory[k] *= 0.99;
  }
  appHistory[key] = (appHistory[key] || 0) + 1;
  trimAppHistory();
  saveAppHistory();
}

// Load initially
loadAppHistory();

function getAppList() {
  return getRawAppList().sort((a, b) => {
    const keyA = getAppHistoryKey(a);
    const keyB = getAppHistoryKey(b);
    const scoreA = appHistory[keyA] || 0;
    const scoreB = appHistory[keyB] || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export function searchApps(q: string) {
  const allApps = getAppList();
  if (q === '') return getUniqueAppResults(allApps);
  const keywords = q.split(/\s+/);

  const results = allApps
    .map((appItem) => {
      const name = (appItem.name || '').toLowerCase();
      const desc = (appItem.description || '').toLowerCase();
      const exec = (appItem.executable || '').toLowerCase();
      const searchString = name + ' ' + desc + ' ' + exec;

      let score = 0;
      if (name.startsWith(q)) score += 100;
      else if (name.includes(q)) score += 50;
      else if (exec.includes(q)) score += 30;
      else if (desc.includes(q)) score += 10;

      const matchesAll = keywords.every((kw) => searchString.includes(kw));
      if (!matchesAll) score = 0;

      const key = getAppHistoryKey(appItem);
      const historyScore = appHistory[key] || 0;
      if (score > 0) {
        score += historyScore * 10;
      }

      return { app: appItem, score };
    })
    .filter((x) => x.score > 0);

  results.sort((a, b) => b.score - a.score);
  return getUniqueAppResults(results.map((x) => x.app));
}

function searchWeb(query: string) {
  execAsync(['xdg-open', `https://google.com/search?q=${encodeURIComponent(query)}`]).catch(
    () => {},
  );
}

const DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;
const HTTP_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

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
