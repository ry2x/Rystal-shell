import {type Accessor, For} from 'ags';
import {Gtk} from 'ags/gtk4';

import {shellMotion} from '@/lib/motion';
import {createAnimatedListEntries} from '@/stores/common/animatedList';

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
    <box class={className} orientation={Gtk.Orientation.VERTICAL}>
      <For each={entries} id={entry => entry.id}>
        {entry => (
          <revealer
            transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
            transitionDuration={shellMotion.listDuration}
            revealChild={entry.revealed}
          >
            <box orientation={Gtk.Orientation.VERTICAL}>
              <revealer
                transitionType={Gtk.RevealerTransitionType.CROSSFADE}
                transitionDuration={shellMotion.listDuration}
                revealChild={entry.revealed}
              >
                <For each={entry.item.as(item => [item])}>{renderItem}</For>
              </revealer>
              {spacing > 0 && <box heightRequest={spacing} />}
            </box>
          </revealer>
        )}
      </For>
    </box>
  ) as Gtk.Box;
}
