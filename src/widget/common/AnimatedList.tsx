import { type Accessor, For } from 'ags';
import { Gtk } from 'ags/gtk4';

import { shellMotion } from '../../lib/motion';
import { createAnimatedListEntries } from '../../stores/common/animatedList';

export interface AnimatedListProps<T> {
  items: Accessor<T[]>;
  idFor: (item: T) => string;
  renderItem: (item: T) => JSX.Element;
  className?: string;
  spacing?: number;
}

export default function AnimatedList<T>({
  items,
  idFor,
  renderItem,
  className,
  spacing = 0,
}: AnimatedListProps<T>) {
  const entries = createAnimatedListEntries(items, idFor);

  return (
    <box class={className} orientation={Gtk.Orientation.VERTICAL} spacing={spacing}>
      <For each={entries} id={(entry) => entry.id}>
        {(entry) => (
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
