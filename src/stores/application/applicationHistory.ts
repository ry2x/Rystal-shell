import Apps from 'gi://AstalApps';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {ryprlandStateDir} from '../../lib/paths';

const STATE_DIR = `${ryprlandStateDir}/rystal-shell`;
const HISTORY_FILE = `${STATE_DIR}/app-history.json`;
const LEGACY_HISTORY_FILE = `${GLib.get_user_cache_dir()}/ags/app_history.json`;
const MAX_HISTORY_ENTRIES = 100;

interface HistoryStore {
  version: 2;
  scores: Record<string, number>;
}

function getApplicationKey(application: Apps.Application) {
  return application.entry || application.executable || application.name;
}

export class ApplicationHistory {
  private scores: Record<string, number> = {};

  constructor(private readonly applications: Apps.Apps) {
    this.load();
  }

  getScore(application: Apps.Application) {
    return this.scores[getApplicationKey(application)] || 0;
  }

  recordLaunch(application: Apps.Application) {
    const key = getApplicationKey(application);
    if (!key) return;

    for (const historyKey in this.scores) {
      this.scores[historyKey] *= 0.99;
    }
    this.scores[key] = (this.scores[key] || 0) + 1;
    this.trim();
    this.save();
  }

  private trim() {
    const entries = Object.entries(this.scores)
      .filter(([, score]) => Number.isFinite(score) && score > 0)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, MAX_HISTORY_ENTRIES);
    this.scores = Object.fromEntries(entries);
  }

  private migrateLegacyScores(legacy: Record<string, number>) {
    const migrated: Record<string, number> = {};
    for (const [legacyKey, score] of Object.entries(legacy)) {
      const matches = this.applications
        .get_list()
        .filter(
          application => application.executable === legacyKey || application.name === legacyKey
        );
      if (matches.length === 1 && Number.isFinite(score)) {
        const key = getApplicationKey(matches[0]);
        migrated[key] = (migrated[key] ?? 0) + score;
      }
    }
    return migrated;
  }

  private load() {
    try {
      const currentFile = Gio.File.new_for_path(HISTORY_FILE);
      const usingLegacyFile = !currentFile.query_exists(null);
      let shouldSave = usingLegacyFile;
      const file = usingLegacyFile ? Gio.File.new_for_path(LEGACY_HISTORY_FILE) : currentFile;
      if (!file.query_exists(null)) return;

      const [success, contents] = file.load_contents(null);
      if (!success) return;

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
        this.scores = parsed.scores as Record<string, number>;
      } else if (typeof parsed === 'object' && parsed !== null) {
        this.scores = this.migrateLegacyScores(parsed as Record<string, number>);
        shouldSave = true;
      }

      this.trim();
      if (shouldSave) this.save();
    } catch (error) {
      console.error('Failed to load app history', error);
    }
  }

  private save() {
    try {
      const file = Gio.File.new_for_path(HISTORY_FILE);
      const parent = file.get_parent();
      if (parent && !parent.query_exists(null)) {
        parent.make_directory_with_parents(null);
      }
      const contents = new TextEncoder().encode(
        JSON.stringify({version: 2, scores: this.scores} satisfies HistoryStore)
      );
      file.replace_contents(contents, null, false, Gio.FileCreateFlags.NONE, null);
    } catch (error) {
      console.error('Failed to save app history', error);
    }
  }
}
