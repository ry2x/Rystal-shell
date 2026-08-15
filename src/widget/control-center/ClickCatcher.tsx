import { Gtk } from 'ags/gtk4';

export interface ClickCatcherProps {
  onClick: () => void;
  hexpand?: boolean;
  vexpand?: boolean;
  heightRequest?: number;
  widthRequest?: number;
}

export default function ClickCatcher({
  onClick,
  hexpand = false,
  vexpand = false,
  heightRequest = -1,
  widthRequest = -1,
}: ClickCatcherProps) {
  return (
    <box
      class="click-catcher"
      hexpand={hexpand}
      vexpand={vexpand}
      heightRequest={heightRequest}
      widthRequest={widthRequest}
    >
      <Gtk.GestureClick onPressed={onClick} />
    </box>
  );
}
