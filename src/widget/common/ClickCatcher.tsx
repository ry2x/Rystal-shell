import { Gtk } from 'ags/gtk4';

export interface ClickCatcherProps {
  onClick: () => void;
  hexpand?: boolean;
  vexpand?: boolean;
}

export default function ClickCatcher({
  onClick,
  hexpand = false,
  vexpand = false,
}: ClickCatcherProps) {
  return (
    <box class="click-catcher" hexpand={hexpand} vexpand={vexpand}>
      <Gtk.GestureClick onPressed={onClick} />
    </box>
  );
}
