import { Gtk } from 'ags/gtk4';

export interface ClickCatcherProps {
  onClick: () => void;
}

export default function ClickCatcher({ onClick }: ClickCatcherProps) {
  return (
    <box class="click-catcher" hexpand vexpand>
      <Gtk.GestureClick onPressed={onClick} />
    </box>
  );
}
