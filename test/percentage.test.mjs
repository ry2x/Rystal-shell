import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {parsePercentage} from '../src/lib/percentage.ts';

describe('parsePercentage', () => {
  it('accepts integer, decimal, and percent-suffixed values', () => {
    assert.equal(parsePercentage('0'), 0);
    assert.equal(parsePercentage('68'), 68);
    assert.equal(parsePercentage('42.5%'), 42.5);
    assert.equal(parsePercentage('100%'), 100);
  });

  it('rejects out-of-range and malformed values', () => {
    for (const value of ['-1', '100.1', '', ' 50', '50 ', '.5', '50%%', 'volume']) {
      assert.equal(parsePercentage(value), null);
    }
  });
});
