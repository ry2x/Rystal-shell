import Apps from 'gi://AstalApps';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {rystalShellStateDir} from '@/lib/paths';

const STATE_DIR = rystalShellStateDir;
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

/**
 * Manages the history of application launches,
 * allowing for scoring and ranking of applications based on launch frequency.
 * The history is persisted to a JSON file in the user's state directory.
 */
export class ApplicationHistory {
  private scores: Record<string, number> = {};

  constructor(private readonly applications: Apps.Apps) {
    this.load();
  }

  getScore(application: Apps.Application) {
    return this.scores[getApplicationKey(application)] || 0;
  }

  /**
   * Records the launch of an application, updating its score in the history.
   * @param application The application that was launched.
   * @returns void
   */
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

  /**
   * Trims the history to ensure that only the top MAX_HISTORY_ENTRIES are kept,
   * based on their scores.
   */
  private trim() {
    const entries = Object.entries(this.scores)
      .filter(([, score]) => Number.isFinite(score) && score > 0)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, MAX_HISTORY_ENTRIES);
    this.scores = Object.fromEntries(entries);
  }

  /**
   * Migrates legacy scores from an older format to the current format,
   * ensuring that only valid applications are retained.
   * @param legacy A record of legacy application keys and their associated scores.
   * @returns A new record of application keys and their migrated scores.
   */
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

  /**
   * Loads the application launch history from the JSON file.
   */
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
