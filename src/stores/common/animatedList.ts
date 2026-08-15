import { type Accessor, type Setter, createState, onCleanup } from 'ags';
import { type Timer, timeout } from 'ags/time';

import { shellMotion } from '../../lib/motion';

export interface AnimatedListEntry<T> {
  id: string;
  item: T;
  revealed: Accessor<boolean>;
  setRevealed: Setter<boolean>;
}

function cancelTimer(timers: Map<string, Timer>, id: string) {
  timers.get(id)?.cancel();
  timers.delete(id);
}

export function createAnimatedListEntries<T>(
  items: Accessor<T[]>,
  idFor: (item: T) => string,
): Accessor<AnimatedListEntry<T>[]> {
  const [entries, setEntries] = createState<AnimatedListEntry<T>[]>([]);
  const revealTimers = new Map<string, Timer>();
  const removeTimers = new Map<string, Timer>();

  const createEntry = (item: T): AnimatedListEntry<T> => {
    const [revealed, setRevealed] = createState(false);
    const id = idFor(item);
    const timer = timeout(shellMotion.listRevealDelay, () => {
      setRevealed(true);
      revealTimers.delete(id);
    });
    revealTimers.set(id, timer);
    return { id, item, revealed, setRevealed };
  };

  const scheduleRemoval = (entry: AnimatedListEntry<T>) => {
    cancelTimer(revealTimers, entry.id);
    entry.setRevealed(false);
    const timer = timeout(shellMotion.listDuration, () => {
      setEntries(entries.peek().filter((candidate) => candidate.id !== entry.id));
      removeTimers.delete(entry.id);
    });
    removeTimers.set(entry.id, timer);
  };

  const updateEntries = () => {
    const nextItems = items.peek();
    const previousEntries = entries.peek();
    const previousById = new Map(previousEntries.map((entry) => [entry.id, entry]));
    const nextIds = new Set(nextItems.map(idFor));

    const nextEntries = nextItems.map((item) => {
      const id = idFor(item);
      const previousEntry = previousById.get(id);
      if (!previousEntry) return createEntry(item);

      previousEntry.item = item;
      if (removeTimers.has(id)) {
        cancelTimer(removeTimers, id);
        previousEntry.setRevealed(true);
      }
      return previousEntry;
    });

    for (const entry of previousEntries) {
      if (!nextIds.has(entry.id) && !removeTimers.has(entry.id)) scheduleRemoval(entry);
    }

    setEntries([...nextEntries, ...previousEntries.filter((entry) => !nextIds.has(entry.id))]);
  };

  const unsubscribe = items.subscribe(updateEntries);
  updateEntries();

  onCleanup(() => {
    unsubscribe();
    for (const timer of revealTimers.values()) timer.cancel();
    for (const timer of removeTimers.values()) timer.cancel();
    revealTimers.clear();
    removeTimers.clear();
  });

  return entries;
}
