import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {resolveConfig} from '../src/lib/configParser.ts';

const DEFAULT_CONFIG = {
  ui: {scale: 1, monitors: {}},
  brightness: {backend: 'auto'},
  weather: {location: ''},
  notifications: {maxCount: 30},
  worldClocks: [
    {label: 'London', tz: 'Europe/London'},
    {label: 'Brisbane', tz: 'Australia/Brisbane'},
    {label: 'New York', tz: 'America/New_York'},
    {label: 'Los Angeles', tz: 'America/Los_Angeles'},
  ],
  recorder: {
    savePath: '~/Videos',
    filenameFormat: 'recording_%Y-%m-%d_%H.%M.%S.mp4',
    recordAudio: true,
    audioSource: 'system',
  },
  profile: {
    avatarPath: '~/Profile/Profile.png',
    handle: undefined,
    os: undefined,
  },
};

function mockWarnings(context) {
  return context.mock.method(console, 'warn', () => {});
}

describe('resolveConfig', () => {
  it('returns defaults for an empty object', () => {
    assert.deepEqual(resolveConfig({}), DEFAULT_CONFIG);
  });

  it('fills missing properties within configured sections', () => {
    const config = resolveConfig({
      weather: {location: 'Tokyo'},
      recorder: {recordAudio: false},
      profile: {handle: '@rystal'},
    });

    assert.equal(config.weather.location, 'Tokyo');
    assert.deepEqual(config.recorder, {...DEFAULT_CONFIG.recorder, recordAudio: false});
    assert.deepEqual(config.profile, {
      avatarPath: DEFAULT_CONFIG.profile.avatarPath,
      handle: '@rystal',
      os: undefined,
    });
  });

  it('accepts supported UI scales', () => {
    for (const scale of [0.75, 1, 1.25, 1.5, 2]) {
      assert.equal(resolveConfig({ui: {scale}}).ui.scale, scale);
    }
  });

  it('falls back for unsupported UI scales', context => {
    const warnings = mockWarnings(context);

    assert.equal(resolveConfig({ui: {scale: 1.1}}).ui.scale, 1);
    assert.equal(resolveConfig({ui: {scale: '1.25'}}).ui.scale, 1);
    assert.equal(warnings.mock.callCount(), 2);
  });

  it('accepts monitor-specific UI scales', () => {
    const config = resolveConfig({
      ui: {scale: 1, monitors: {'DP-1': {scale: 1.25}, 'HDMI-A-1': {scale: 0.75}}},
    });

    assert.deepEqual(config.ui, {
      scale: 1,
      monitors: {'DP-1': {scale: 1.25}, 'HDMI-A-1': {scale: 0.75}},
    });
  });

  it('ignores invalid monitor-specific UI scales', context => {
    const warnings = mockWarnings(context);
    const config = resolveConfig({
      ui: {scale: 1.5, monitors: {'DP-1': {scale: 1.1}, '': {scale: 2}, broken: false}},
    });

    assert.deepEqual(config.ui, {scale: 1.5, monitors: {}});
    assert.equal(warnings.mock.callCount(), 3);
  });

  it('falls back for invalid enum and number values', context => {
    const warnings = mockWarnings(context);
    const config = resolveConfig({
      brightness: {backend: 'invalid'},
      notifications: {maxCount: 0},
      recorder: {audioSource: 'invalid'},
    });

    assert.equal(config.brightness.backend, DEFAULT_CONFIG.brightness.backend);
    assert.equal(config.notifications.maxCount, DEFAULT_CONFIG.notifications.maxCount);
    assert.equal(config.recorder.audioSource, DEFAULT_CONFIG.recorder.audioSource);
    assert.equal(warnings.mock.callCount(), 3);
  });

  it('falls back for blank recorder paths and filename formats', context => {
    const warnings = mockWarnings(context);
    const config = resolveConfig({
      recorder: {savePath: '', filenameFormat: '   '},
    });

    assert.equal(config.recorder.savePath, DEFAULT_CONFIG.recorder.savePath);
    assert.equal(config.recorder.filenameFormat, DEFAULT_CONFIG.recorder.filenameFormat);
    assert.equal(warnings.mock.callCount(), 2);
  });

  it('replaces world clocks as a complete array', () => {
    const worldClocks = [{label: 'Tokyo', tz: 'Asia/Tokyo'}];

    assert.deepEqual(resolveConfig({worldClocks}).worldClocks, worldClocks);
    assert.deepEqual(resolveConfig({worldClocks: []}).worldClocks, []);
  });

  it('ignores invalid world clock entries', context => {
    const warnings = mockWarnings(context);
    const config = resolveConfig({
      worldClocks: [
        {label: 'Tokyo', tz: 'Asia/Tokyo'},
        {label: 'Invalid timezone', tz: 'Not/AZone'},
        {label: 'Missing timezone'},
        null,
      ],
    });

    assert.deepEqual(config.worldClocks, [{label: 'Tokyo', tz: 'Asia/Tokyo'}]);
    assert.equal(warnings.mock.callCount(), 3);
  });

  it('reports unknown keys', context => {
    const warnings = mockWarnings(context);

    resolveConfig({weather: {location: 'Tokyo', typo: true}});

    assert.equal(warnings.mock.callCount(), 1);
    assert.match(warnings.mock.calls[0].arguments[0], /weather\.typo/);
  });

  it('returns defaults for a non-object root', context => {
    const warnings = mockWarnings(context);

    assert.deepEqual(resolveConfig(null), DEFAULT_CONFIG);
    assert.equal(warnings.mock.callCount(), 1);
  });

  it('does not mutate inputs or share default arrays between calls', () => {
    const input = {recorder: {recordAudio: false}};
    const first = resolveConfig(input);
    first.worldClocks.push({label: 'Tokyo', tz: 'Asia/Tokyo'});
    const second = resolveConfig(input);

    assert.deepEqual(input, {recorder: {recordAudio: false}});
    assert.deepEqual(second.worldClocks, DEFAULT_CONFIG.worldClocks);
  });
});
