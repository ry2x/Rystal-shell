import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
  createUiScaleContext,
  resolveUiScale,
  scaleSize,
  scaleValue,
  uiScaleClass,
} from '../src/lib/scale.ts';

describe('UI scale helpers', () => {
  it('scales exact values, including negative values', () => {
    assert.equal(scaleValue(16, 1.25), 20);
    assert.equal(scaleValue(-5, 0.75), -3.75);
  });

  it('rounds GTK sizes to the nearest integer', () => {
    assert.equal(scaleSize(47, 0.75), 35);
    assert.equal(scaleSize(47, 1.25), 59);
    assert.equal(scaleSize(-5, 0.75), -4);
  });
});

describe('monitor UI scale context', () => {
  const config = {scale: 1, monitors: {'DP-1': {scale: 1.25}}};

  it('resolves monitor overrides and the global fallback', () => {
    assert.equal(resolveUiScale('DP-1', config), 1.25);
    assert.equal(resolveUiScale('HDMI-A-1', config), 1);
    assert.equal(resolveUiScale(null, config), 1);
  });

  it('provides bound value and integer size helpers', () => {
    const context = createUiScaleContext('DP-1', config);

    assert.equal(context.value(-5), -6.25);
    assert.equal(context.size(47), 59);
    assert.equal(context.cssClass, 'ui-scale-125');
  });

  it('uses stable CSS class names for every supported scale', () => {
    assert.deepEqual([0.75, 1, 1.25, 1.5, 2].map(uiScaleClass), [
      'ui-scale-075',
      'ui-scale-100',
      'ui-scale-125',
      'ui-scale-150',
      'ui-scale-200',
    ]);
  });
});
