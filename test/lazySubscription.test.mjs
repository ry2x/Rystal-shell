import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {createLazySubscription} from '../src/stores/common/lazySubscription.ts';

describe('createLazySubscription', () => {
  it('starts on the first subscriber and shares the producer', () => {
    let starts = 0;
    const source = createLazySubscription(0, () => {
      starts += 1;
      return () => {};
    });

    const unsubscribeFirst = source.subscribe(() => {});
    const unsubscribeSecond = source.subscribe(() => {});

    assert.equal(starts, 1);
    unsubscribeFirst();
    unsubscribeSecond();
  });

  it('stops after the final subscriber and ignores duplicate unsubscribe calls', () => {
    let stops = 0;
    const source = createLazySubscription(0, () => () => {
      stops += 1;
    });
    const unsubscribeFirst = source.subscribe(() => {});
    const unsubscribeSecond = source.subscribe(() => {});

    unsubscribeFirst();
    unsubscribeFirst();
    assert.equal(stops, 0);

    unsubscribeSecond();
    unsubscribeSecond();
    assert.equal(stops, 1);
  });

  it('restarts after becoming observed again and retains the latest value', () => {
    let starts = 0;
    const source = createLazySubscription(1, setValue => {
      starts += 1;
      setValue(value => value + 1);
      return () => {};
    });

    source.subscribe(() => {})();
    assert.equal(source.get(), 2);

    source.subscribe(() => {})();
    assert.equal(starts, 2);
    assert.equal(source.get(), 3);
  });

  it('notifies only when Object.is considers the value changed', () => {
    let setValue;
    let notifications = 0;
    const source = createLazySubscription(0, set => {
      setValue = set;
      return () => {};
    });
    const unsubscribe = source.subscribe(() => {
      notifications += 1;
    });

    setValue(0);
    setValue(previous => previous + 1);
    setValue(1);

    assert.equal(source.get(), 1);
    assert.equal(notifications, 1);
    unsubscribe();
  });
});
