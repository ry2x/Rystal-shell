import GLib from 'gi://GLib?version=2.0';

import {resolveConfig} from '@/lib/configParser';
import {rystalShellConfigDir} from '@/lib/paths';

function loadConfig() {
  const configPath = `${rystalShellConfigDir}/config.json`;
  if (!GLib.file_test(configPath, GLib.FileTest.EXISTS)) return resolveConfig({});

  try {
    const [success, bytes] = GLib.file_get_contents(configPath);
    if (!success || !bytes) throw new Error('Unable to read the file');
    const jsonString = new TextDecoder('utf-8').decode(bytes);
    const parsed: unknown = JSON.parse(jsonString);
    return resolveConfig(parsed);
  } catch (error) {
    console.error(`Failed to load '${configPath}':`, error);
    return resolveConfig({});
  }
}

export const appConfig = loadConfig();
