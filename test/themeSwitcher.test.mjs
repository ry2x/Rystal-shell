import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {URL, fileURLToPath} from 'node:url';

const switcher = fileURLToPath(new URL('../theme-switcher/theme-switch.sh', import.meta.url));

function writeExecutable(filePath, contents) {
  fs.writeFileSync(filePath, contents, {mode: 0o755});
}

describe('theme-switch.sh mode state', () => {
  let temporaryDirectory;
  let environment;
  let modeFile;
  let themeFile;
  let wallpaper;
  let commandLog;

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rystal-theme-test-'));
    const binDirectory = path.join(temporaryDirectory, 'bin');
    const configDirectory = path.join(temporaryDirectory, 'config');
    const stateDirectory = path.join(temporaryDirectory, 'state');
    const runtimeDirectory = path.join(temporaryDirectory, 'runtime');
    const wallpaperDirectory = path.join(temporaryDirectory, 'wallpapers');

    fs.mkdirSync(binDirectory);
    fs.mkdirSync(wallpaperDirectory);
    wallpaper = path.join(wallpaperDirectory, 'wallpaper.png');
    commandLog = path.join(temporaryDirectory, 'commands.log');
    modeFile = path.join(stateDirectory, 'theme', 'mode');
    themeFile = path.join(configDirectory, 'theme.scss');
    fs.writeFileSync(wallpaper, 'test image');

    writeExecutable(
      path.join(binDirectory, 'matugen'),
      `#!/usr/bin/env bash
set -eu
[[ "\${MATUGEN_FAIL:-0}" != 1 ]] || exit 1
mode=unknown
while (($# > 0)); do
    if [[ "$1" == -m ]]; then
        mode="$2"
        shift
    fi
    shift
done
printf '$generated-mode: %s;\\n' "$mode" >"$HOME/theme.scss"
printf 'matugen %s\\n' "$mode" >>"$TEST_COMMAND_LOG"
`
    );
    writeExecutable(
      path.join(binDirectory, 'magick'),
      `#!/usr/bin/env bash
set -eu
for argument in "$@"; do output="$argument"; done
output="\${output#png:}"
printf 'launcher' >"$output"
printf 'magick\\n' >>"$TEST_COMMAND_LOG"
`
    );
    writeExecutable(
      path.join(binDirectory, 'awww'),
      `#!/usr/bin/env bash
printf 'awww\\n' >>"$TEST_COMMAND_LOG"
`
    );
    writeExecutable(
      path.join(binDirectory, 'ags'),
      `#!/usr/bin/env bash
[[ "\${1:-}" != list ]] || exit 0
`
    );

    environment = {
      ...process.env,
      HOME: temporaryDirectory,
      PATH: `${binDirectory}:${process.env.PATH}`,
      RYSTAL_SHELL_CONFIG_DIR: configDirectory,
      RYSTAL_SHELL_RUNTIME_DIR: runtimeDirectory,
      RYSTAL_SHELL_STATE_DIR: stateDirectory,
      RYSTAL_SHELL_WALLPAPER_DIR: wallpaperDirectory,
      TEST_COMMAND_LOG: commandLog,
    };
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, {recursive: true, force: true});
  });

  function run(args, overrides = {}) {
    return spawnSync('bash', [switcher, ...args], {
      encoding: 'utf8',
      env: {...environment, ...overrides},
    });
  }

  function runAsync(args, overrides = {}) {
    return new Promise(resolve => {
      const child = spawn('bash', [switcher, ...args], {
        env: {...environment, ...overrides},
      });
      let stderr = '';

      child.stderr.setEncoding('utf8');
      child.stderr.on('data', chunk => {
        stderr += chunk;
      });
      child.on('close', status => resolve({status, stderr}));
    });
  }

  it('reports dark without creating state for a new installation', () => {
    const result = run(['status']);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'dark\n');
    assert.equal(fs.existsSync(modeFile), false);
  });

  it('persists an explicit mode and reuses it for refresh', () => {
    const initial = run(['--light', 'set', '--', wallpaper]);
    const refresh = run(['refresh']);

    assert.equal(initial.status, 0, initial.stderr);
    assert.equal(refresh.status, 0, refresh.stderr);
    assert.equal(fs.readFileSync(modeFile, 'utf8'), 'light\n');
    assert.equal(fs.readFileSync(themeFile, 'utf8'), '$generated-mode: light;\n');
    assert.deepEqual(fs.readFileSync(commandLog, 'utf8').trim().split('\n'), [
      'matugen light',
      'magick',
      'awww',
      'matugen light',
      'magick',
    ]);
  });

  it('applies mode and toggle without changing the wallpaper', () => {
    assert.equal(run(['set', wallpaper]).status, 0);
    assert.equal(run(['mode', 'light']).status, 0);
    assert.equal(run(['toggle']).status, 0);

    assert.equal(fs.readFileSync(modeFile, 'utf8'), 'dark\n');
    assert.equal(run(['status']).stdout, 'dark\n');
    assert.equal(
      fs
        .readFileSync(commandLog, 'utf8')
        .trim()
        .split('\n')
        .filter(line => line === 'awww').length,
      1
    );
  });

  it('serializes concurrent toggles against the latest saved mode', async () => {
    assert.equal(run(['set', wallpaper]).status, 0);

    const toggles = await Promise.all([runAsync(['toggle']), runAsync(['toggle'])]);

    assert.deepEqual(
      toggles.map(result => result.status),
      [0, 0],
      toggles.map(result => result.stderr).join('\n')
    );
    assert.equal(fs.readFileSync(modeFile, 'utf8'), 'dark\n');
  });

  it('falls back safely from an invalid saved mode', () => {
    fs.mkdirSync(path.dirname(modeFile), {recursive: true});
    fs.writeFileSync(modeFile, 'sepia\n');

    const result = run(['status']);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'dark\n');
    assert.match(result.stderr, /Invalid saved mode/);
  });

  it('does not save a requested mode when generation fails', () => {
    assert.equal(run(['--light', 'set', wallpaper]).status, 0);
    const previousTheme = fs.readFileSync(themeFile, 'utf8');

    const failed = run(['mode', 'dark'], {MATUGEN_FAIL: '1'});

    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /Matugen failed/);
    assert.equal(fs.readFileSync(modeFile, 'utf8'), 'light\n');
    assert.equal(fs.readFileSync(themeFile, 'utf8'), previousTheme);
  });

  it('rejects invalid mode commands without changing state', () => {
    const invalid = run(['mode', 'sepia']);
    const conflicting = run(['--light', 'toggle']);

    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /dark or light/);
    assert.notEqual(conflicting.status, 0);
    assert.match(conflicting.stderr, /does not accept/);
    assert.equal(fs.existsSync(modeFile), false);
  });
});
