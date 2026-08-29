import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {resolveConfig} from '../src/lib/configParser.ts';

const DEFAULT_CONFIG = {
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

  it('replaces world clocks as a complete array', () => {
    const worldClocks = [{label: 'Tokyo', tz: 'Asia/Tokyo'}];

    assert.deepEqual(resolveConfig({worldClocks}).worldClocks, worldClocks);
    assert.deepEqual(resolveConfig({worldClocks: []}).worldClocks, []);
  });

  it('ignores invalid world clock entries', context => {
    const warnings = mockWarnings(context);
    const config = resolveConfig({
      worldClocks: [{label: 'Tokyo', tz: 'Asia/Tokyo'}, {label: 'Missing timezone'}, null],
    });

    assert.deepEqual(config.worldClocks, [{label: 'Tokyo', tz: 'Asia/Tokyo'}]);
    assert.equal(warnings.mock.callCount(), 2);
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
