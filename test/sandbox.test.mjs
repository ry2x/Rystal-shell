import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {describe, it} from 'node:test';
import {URL, fileURLToPath} from 'node:url';

const sandbox = fileURLToPath(new URL('../scripts/sandbox.sh', import.meta.url));
const session = fileURLToPath(new URL('../scripts/sandbox-session.sh', import.meta.url));
const scenarios = fileURLToPath(new URL('../debug/run-memory-scenarios.sh', import.meta.url));
const collector = fileURLToPath(new URL('../debug/collect-memory.sh', import.meta.url));
const smokeChecks = fileURLToPath(new URL('../scripts/sandbox/smoke-checks.sh', import.meta.url));

describe('isolated trial entry points', () => {
  it('disables host dependency installation and Corepack downloads before toolchain discovery', () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rystal-discovery-test-'));
    try {
      const scriptDirectory = path.join(temporaryDirectory, 'scripts');
      const binDirectory = path.join(temporaryDirectory, 'bin');
      fs.mkdirSync(scriptDirectory);
      fs.mkdirSync(binDirectory);
      fs.mkdirSync(path.join(temporaryDirectory, 'node_modules'));
      fs.copyFileSync(sandbox, path.join(scriptDirectory, 'sandbox.sh'));
      const pnpmStub = path.join(binDirectory, 'pnpm');
      const installMarker = path.join(temporaryDirectory, 'unexpected-install');
      const callsFile = path.join(temporaryDirectory, 'pnpm-calls');
      fs.writeFileSync(
        pnpmStub,
        `#!/bin/bash
if [[ "$pnpm_config_verify_deps_before_run" != false || "$COREPACK_ENABLE_NETWORK" != 0 || "$COREPACK_ENABLE_AUTO_PIN" != 0 ]]; then
  touch "$SANDBOX_TEST_INSTALL"
fi
printf '%s\\n' "$*" >> "$SANDBOX_TEST_CALLS"
if [[ "$2" == node ]]; then
  printf '%s\\n' "$SANDBOX_TEST_NODE"
else
  printf '%s\\n' "$SANDBOX_TEST_PNPM"
fi
`,
        {mode: 0o755}
      );
      // Stop at the namespace preflight; this test never starts a real sandbox or desktop.
      fs.writeFileSync(path.join(binDirectory, 'bwrap'), '#!/bin/bash\nexit 1\n', {mode: 0o755});
      fs.symlinkSync(process.execPath, path.join(binDirectory, 'node'));
      const result = spawnSync('/bin/bash', [path.join(scriptDirectory, 'sandbox.sh'), 'probe'], {
        env: {
          ...process.env,
          PATH: `${binDirectory}:/usr/bin`,
          pnpm_config_verify_deps_before_run: 'install',
          COREPACK_ENABLE_NETWORK: '1',
          COREPACK_ENABLE_AUTO_PIN: '1',
          SANDBOX_TEST_NODE: process.execPath,
          SANDBOX_TEST_PNPM: pnpmStub,
          SANDBOX_TEST_INSTALL: installMarker,
          SANDBOX_TEST_CALLS: callsFile,
        },
        encoding: 'utf8',
      });

      assert.equal(result.status, 1, result.stderr);
      assert.equal(fs.readFileSync(callsFile, 'utf8').trim().split('\n').length, 2);
      assert.equal(fs.existsSync(installMarker), false);
      assert.equal(fs.existsSync(path.join(temporaryDirectory, '.dev')), false);
    } finally {
      fs.rmSync(temporaryDirectory, {recursive: true, force: true});
    }
  });

  it('prints plans without desktop dependencies or output files', () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rystal-plan-test-'));
    try {
      // dirname is the only external command needed to resolve these script locations.
      fs.symlinkSync('/usr/bin/dirname', path.join(temporaryDirectory, 'dirname'));
      const environment = {...process.env, PATH: temporaryDirectory};
      const plan = spawnSync('/bin/bash', [sandbox, 'desktop', '--dry-run'], {
        env: environment,
        encoding: 'utf8',
      });
      const outputDirectory = path.join(temporaryDirectory, 'results');
      const memoryPlan = spawnSync(
        '/bin/bash',
        [scenarios, '--scenario', 'notifications', '--dry-run', '--results-dir', outputDirectory],
        {env: environment, encoding: 'utf8'}
      );

      assert.equal(plan.status, 0, plan.stderr);
      assert.equal(memoryPlan.status, 0, memoryPlan.stderr);
      assert.match(plan.stdout, /Private HOME/);
      assert.match(memoryPlan.stdout, /notify-send/);
      assert.equal(fs.existsSync(outputDirectory), false);
    } finally {
      fs.rmSync(temporaryDirectory, {recursive: true, force: true});
    }
  });

  it('refuses live memory scenarios before creating results or looking for tools', () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rystal-guard-test-'));
    try {
      const outputDirectory = path.join(temporaryDirectory, 'results');
      const result = spawnSync('/bin/bash', [scenarios, '--results-dir', outputDirectory], {
        env: {...process.env, RYSTAL_SHELL_SANDBOX: ''},
        encoding: 'utf8',
      });

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Refusing to change the active desktop/);
      assert.equal(fs.existsSync(outputDirectory), false);
    } finally {
      fs.rmSync(temporaryDirectory, {recursive: true, force: true});
    }
  });

  it('rejects direct execution of the internal session', () => {
    const result = spawnSync('/bin/bash', [session, 'desktop'], {
      env: {...process.env, RYSTAL_SHELL_SANDBOX: ''},
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Use scripts\/sandbox.sh/);
  });

  it('collects memory for the explicit PID instead of another running shell', async () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rystal-pid-test-'));
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'});
    try {
      await once(child, 'spawn');
      const outputFile = path.join(temporaryDirectory, 'memory.csv');
      const result = spawnSync(
        '/bin/bash',
        [
          collector,
          '--pid',
          String(child.pid),
          '--output',
          outputFile,
          '--scenario',
          'pid-test',
          '--iteration',
          '0',
          '--phase',
          'baseline',
        ],
        {env: {...process.env, RYSTAL_SHELL_PID: 'invalid'}, encoding: 'utf8'}
      );

      assert.equal(result.status, 0, result.stderr);
      const [, row] = fs.readFileSync(outputFile, 'utf8').trim().split('\n');
      assert.equal(row.split(',')[4], String(child.pid));
      assert.ok(Number(row.split(',')[5]) > 0);
    } finally {
      child.kill();
      fs.rmSync(temporaryDirectory, {recursive: true, force: true});
    }
  });
});

describe('smoke failure detection', () => {
  it('fails actual memory scenarios on IPC Error responses, including closes and notification clearing', () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rystal-memory-ipc-test-'));
    try {
      for (const directory of [
        'debug',
        'scripts/sandbox',
        'theme-switcher',
        'bin',
        'home/Pictures',
      ]) {
        fs.mkdirSync(path.join(temporaryDirectory, directory), {recursive: true});
      }
      const trialScript = path.join(temporaryDirectory, 'debug/run-memory-scenarios.sh');
      fs.copyFileSync(scenarios, trialScript);
      fs.copyFileSync(
        smokeChecks,
        path.join(temporaryDirectory, 'scripts/sandbox/smoke-checks.sh')
      );
      const snapshotsFile = path.join(temporaryDirectory, 'snapshots');
      const callsFile = path.join(temporaryDirectory, 'calls');
      fs.writeFileSync(
        path.join(temporaryDirectory, 'debug/collect-memory.sh'),
        '#!/bin/bash\nprintf "%s\\n" "$*" >> "$SANDBOX_TEST_SNAPSHOTS"\n',
        {mode: 0o755}
      );
      fs.writeFileSync(
        path.join(temporaryDirectory, 'bin/ags'),
        `#!/bin/bash
read -r count < "$SANDBOX_TEST_CALLS"
count=$((count + 1))
printf '%s\\n' "$count" > "$SANDBOX_TEST_CALLS"
if ((count == SANDBOX_TEST_FAIL_AT)); then
  printf 'Error: injected memory IPC failure\\n'
else
  printf 'Request accepted\\n'
fi
`,
        {mode: 0o755}
      );
      for (const stub of ['bin/notify-send', 'bin/sleep', 'theme-switcher/theme-switch.sh']) {
        fs.writeFileSync(path.join(temporaryDirectory, stub), '#!/bin/bash\nexit 0\n', {
          mode: 0o755,
        });
      }
      fs.writeFileSync(path.join(temporaryDirectory, 'home/Pictures/image.png'), 'fixture');

      const scenarioCases = [
        ['launcher-no-theme', 1, 'baseline'],
        ['launcher-no-theme', 2, 'opened'],
        ['wallpaper', 2, 'theme_changed'],
        ['css-only', 1, 'before_css'],
        ['notifications', 1, 'added'],
        ['launcher-no-theme', 0, 'closed'],
      ];
      for (const [scenario, failAt, lastPhase] of scenarioCases) {
        fs.writeFileSync(callsFile, '0\n');
        fs.writeFileSync(snapshotsFile, '');
        const result = spawnSync(
          '/bin/bash',
          [
            trialScript,
            '--scenario',
            scenario,
            '--iterations',
            '1',
            '--notifications',
            '1',
            '--settle-seconds',
            '0',
            '--gc-wait-seconds',
            '0',
            '--results-dir',
            path.join(temporaryDirectory, 'results'),
          ],
          {
            env: {
              ...process.env,
              PATH: `${temporaryDirectory}/bin:/usr/bin`,
              HOME: path.join(temporaryDirectory, 'home'),
              RYSTAL_SHELL_SANDBOX: '1',
              RYSTAL_SHELL_INSTANCE: 'rystal-shell-test',
              SANDBOX_TEST_FAIL_AT: String(failAt),
              SANDBOX_TEST_CALLS: callsFile,
              SANDBOX_TEST_SNAPSHOTS: snapshotsFile,
            },
            encoding: 'utf8',
          }
        );

        assert.equal(result.status, failAt === 0 ? 0 : 1, `${scenario}: ${result.stdout}`);
        const snapshots = fs.readFileSync(snapshotsFile, 'utf8').trim().split('\n');
        assert.ok(snapshots.at(-1).endsWith(`--phase ${lastPhase}`));
        if (failAt === 0) assert.match(result.stdout, /Results written to/);
        else {
          assert.match(result.stderr, /Error: injected memory IPC failure/);
          assert.doesNotMatch(result.stdout, /Results written to/);
        }
      }
    } finally {
      fs.rmSync(temporaryDirectory, {recursive: true, force: true});
    }
  });

  it('rejects Error responses with a successful CLI exit for panel toggles and notification clearing', () => {
    for (const command of ['toggle-launcher', 'clear-notifications']) {
      const result = spawnSync(
        '/bin/bash',
        [
          '-c',
          'source "$1"; ags() { printf "Error: injected failure\\n"; }; checked_ags_request "$2"',
          'smoke-test',
          smokeChecks,
          command,
        ],
        {env: {...process.env, RYSTAL_SHELL_INSTANCE: 'rystal-shell-test'}, encoding: 'utf8'}
      );

      assert.equal(result.status, 1);
      assert.match(result.stderr, /Error: injected failure/);
      assert.ok(result.stderr.includes(command));
    }
  });

  it('rejects CLI failures and preserves successful IPC responses', () => {
    for (const exitCode of [0, 7]) {
      const result = spawnSync(
        '/bin/bash',
        [
          '-c',
          'source "$1"; ags() { printf "Toggled App Launcher\\n"; return "$SANDBOX_TEST_EXIT"; }; checked_ags_request toggle-launcher',
          'smoke-test',
          smokeChecks,
        ],
        {
          env: {
            ...process.env,
            RYSTAL_SHELL_INSTANCE: 'rystal-shell-test',
            SANDBOX_TEST_EXIT: String(exitCode),
          },
          encoding: 'utf8',
        }
      );

      assert.equal(result.status, exitCode === 0 ? 0 : 1);
      if (exitCode === 0) assert.equal(result.stdout, 'Toggled App Launcher\n');
      else assert.match(result.stderr, /AGS request failed/);
    }
  });

  it('detects Gnim child mutation errors while accepting unavailable sandbox services', () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rystal-log-test-'));
    try {
      const logFile = path.join(temporaryDirectory, 'shell.log');
      const logCases = [
        ['Gjs-Console-CRITICAL **: TypeError: cannot add null to parent', 1],
        ['rystal-shell-test-CRITICAL **: TypeError: cannot remove undefined from parent', 1],
        ['rystal-shell-test-CRITICAL **: Error: cannot add invalid child to parent', 1],
        ['Gjs-Console-CRITICAL **: Error: out of tracking context: will not be able to cleanup', 1],
        ['rystal-shell-test-CRITICAL **: Error: cannot attach onMount: out of tracking context', 1],
        ['Gjs-CRITICAL **: JS ERROR: Error: injected failure', 1],
        ['Failed to load profile avatar: missing image', 1],
        [
          'rystal-shell-test-CRITICAL **: Failed to fetch initial brightness: Error: backend unavailable\n' +
            'rystal-shell-test-CRITICAL **: Weather fetch failed: Gio.ResolverError: offline',
          0,
        ],
      ];
      for (const [message, expectedStatus] of logCases) {
        fs.writeFileSync(logFile, `${message}\n`);
        const result = spawnSync(
          '/bin/bash',
          ['-c', 'source "$1"; check_shell_log "$2"', 'smoke-test', smokeChecks, logFile],
          {encoding: 'utf8'}
        );

        assert.equal(result.status, expectedStatus, message);
      }
    } finally {
      fs.rmSync(temporaryDirectory, {recursive: true, force: true});
    }
  });
});
