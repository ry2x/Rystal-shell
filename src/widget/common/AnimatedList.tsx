import { For, createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import { shellMotion } from '../../lib/motion';

type ListState<T> = {
  (): T[];
  subscribe: (callback: () => void) => () => void;
};

type Entry<T> = {
  id: string;
  item: T;
  revealed: ReturnType<typeof createState<boolean>>[0];
  setRevealed: ReturnType<typeof createState<boolean>>[1];
};

export default function AnimatedList<T>({
  items,
  idFor,
  renderItem,
  className,
  spacing = 0,
}: {
  items: ListState<T>;
  idFor: (item: T) => string;
  renderItem: (item: T) => Gtk.Widget;
  className?: string;
  spacing?: number;
}) {
  const [entries, setEntries] = createState<Entry<T>[]>([]);
  const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const removeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let destroyed = false;

  const cancelTimer = (timers: Map<string, ReturnType<typeof setTimeout>>, id: string) => {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
  };

  const createEntry = (item: T): Entry<T> => {
    const [revealed, setRevealed] = createState(false);
    const id = idFor(item);
    const timer = setTimeout(() => {
      if (!destroyed) setRevealed(true);
      revealTimers.delete(id);
    }, shellMotion.listRevealDelay);
    revealTimers.set(id, timer);
    return { id, item, revealed, setRevealed };
  };

  const scheduleRemoval = (entry: Entry<T>) => {
    entry.setRevealed(false);
    const timer = setTimeout(() => {
      if (!destroyed) setEntries(entries.peek().filter((candidate) => candidate.id !== entry.id));
      removeTimers.delete(entry.id);
    }, shellMotion.listDuration);
    removeTimers.set(entry.id, timer);
  };

  const updateEntries = () => {
    const nextItems = items();
    const previous = entries.peek();
    const previousById = new Map(previous.map((entry) => [entry.id, entry]));
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

    const exitingEntries = previous.filter((entry) => !nextIds.has(entry.id));
    for (const entry of exitingEntries) {
      if (!removeTimers.has(entry.id)) {
        scheduleRemoval(entry);
      }
    }

    setEntries([...nextEntries, ...exitingEntries]);
  };

  return (
    <box
      class={className}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={spacing}
      $={(self: Gtk.Box) => {
        const unsubscribe = items.subscribe(updateEntries);
        self.connect('destroy', () => {
          destroyed = true;
          unsubscribe();
          for (const timer of revealTimers.values()) clearTimeout(timer);
          for (const timer of removeTimers.values()) clearTimeout(timer);
          revealTimers.clear();
          removeTimers.clear();
        });
      }}
    >
      <For each={entries}>
        {(entry: Entry<T>) => (
          <revealer
            transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
            transitionDuration={shellMotion.listDuration}
            revealChild={entry.revealed}
          >
            <revealer
              transitionType={Gtk.RevealerTransitionType.CROSSFADE}
              transitionDuration={shellMotion.listDuration}
              revealChild={entry.revealed}
            >
              {renderItem(entry.item)}
            </revealer>
          </revealer>
        )}
      </For>
    </box>
  ) as Gtk.Box;
}
