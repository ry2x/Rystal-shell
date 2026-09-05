import {Accessor} from 'ags';

import {type LazyProducer, createLazySubscription} from './lazySubscription';

/**
 * Keeps externally produced state inactive while it has no observers.
 * Replace this v1-only constructor with createAccessor when Gnim v2 is adopted.
 */
export function createLazyAccessor<T>(initialValue: T, producer: LazyProducer<T>): Accessor<T> {
  const source = createLazySubscription(initialValue, producer);
  return new Accessor(source.get, source.subscribe);
}
