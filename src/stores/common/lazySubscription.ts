type Dispose = () => void;

interface LazySetter<T> {
  (value: T): void;
  (update: (previous: T) => T): void;
}

export type LazyProducer<T> = (set: LazySetter<T>) => Dispose;

export interface LazySubscription<T> {
  get: () => T;
  subscribe: (callback: () => void) => Dispose;
}

export function createLazySubscription<T>(
  initialValue: T,
  producer: LazyProducer<T>
): LazySubscription<T> {
  let currentValue = initialValue;
  let stopProducer: Dispose | null = null;
  const subscribers = new Set<() => void>();

  const setValue: LazySetter<T> = valueOrUpdate => {
    const nextValue =
      typeof valueOrUpdate === 'function'
        ? (valueOrUpdate as (previous: T) => T)(currentValue)
        : valueOrUpdate;
    if (Object.is(currentValue, nextValue)) return;

    currentValue = nextValue;
    [...subscribers].forEach(notify => notify());
  };

  function subscribe(callback: () => void): Dispose {
    if (subscribers.size === 0) stopProducer = producer(setValue);

    const notify = () => callback();
    subscribers.add(notify);
    let subscribed = true;

    return () => {
      if (!subscribed) return;
      subscribed = false;
      subscribers.delete(notify);

      if (subscribers.size === 0) {
        const stop = stopProducer;
        stopProducer = null;
        stop?.();
      }
    };
  }

  return {
    get: () => currentValue,
    subscribe,
  };
}
