import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {scaleSize, scaleValue} from '../src/lib/scale.ts';

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
