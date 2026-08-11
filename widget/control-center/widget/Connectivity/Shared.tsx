import { createState } from 'ags';
import { Gtk } from 'ags/gtk4';

import Pango from 'gi://Pango';

import { LucideIcon } from '../../../../widget/common/lucide';

export type ControlCenterPage = 'main' | 'wifi' | 'bluetooth' | 'sound';

export interface PageState {
  (): ControlCenterPage;
  subscribe(callback: (...args: unknown[]) => void): () => void;
}

export interface Confirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

export function PageHeader({
  title,
  enabled,
  onToggle,
  onBack,
  className,
}: {
  title: string;
  enabled: ReturnType<typeof createState<boolean>>[0];
  onToggle: () => void;
  onBack: () => void;
  className?: string;
}) {
  return (
    <box class={className} spacing={12}>
      <button class="icon-btn" onClicked={onBack} tooltipText="Back">
        <LucideIcon name="chevron-left" pixelSize={22} />
      </button>
      <label label={title} class="cc-title" hexpand halign={Gtk.Align.START} />
      <switch
        class="cc-connectivity-switch"
        valign={Gtk.Align.CENTER}
        $={(self: Gtk.Switch) => {
          let synchronizing = false;
          const sync = () => {
            synchronizing = true;
            self.set_active(enabled());
            synchronizing = false;
          };
          const unsubscribe = enabled.subscribe(sync);
          const hook = self.connect('notify::active', () => {
            if (!synchronizing) onToggle();
            return true;
          });
          sync();
          self.connect('destroy', () => {
            self.disconnect(hook);
            unsubscribe();
          });
        }}
      />
    </box>
  );
}

export function ConfirmOverlay({
  confirmation,
  clear,
  setError,
}: {
  confirmation: Confirmation;
  clear: () => void;
  setError: (message: string) => void;
}) {
  const [busy, setBusy] = createState(false);

  return (
    <box class="cc-modal-backdrop" hexpand vexpand halign={Gtk.Align.FILL} valign={Gtk.Align.FILL}>
      <box
        class="cc-modal"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={12}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
      >
        <label
          label={confirmation.title}
          css="font-weight: 700; font-size: 1.05em;"
          halign={Gtk.Align.START}
        />
        <label label={confirmation.message} wrap halign={Gtk.Align.START} />
        <box spacing={8} halign={Gtk.Align.END}>
          <button class="power-btn" onClicked={clear} sensitive={busy.as((value) => !value)}>
            <label label="Cancel" />
          </button>
          <button
            class="power-btn cc-danger-btn"
            sensitive={busy.as((value) => !value)}
            onClicked={async () => {
              setBusy(true);
              try {
                await confirmation.onConfirm();
                clear();
              } catch (error) {
                setError(String(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label label={confirmation.confirmLabel} />
          </button>
        </box>
      </box>
    </box>
  );
}

export function DetailMenuButton({
  onDisconnect,
  onForget,
  forgetLabel = 'Forget device',
  triggerClass,
}: {
  onDisconnect: () => void;
  onForget: () => void;
  forgetLabel?: string;
  triggerClass?: string;
}) {
  const button = (
    <button
      class={triggerClass ? `icon-btn ${triggerClass}` : 'icon-btn'}
      tooltipText="Connection options"
    >
      <LucideIcon name="settings" pixelSize={16} />
    </button>
  ) as Gtk.Button;
  const popover = new Gtk.Popover();
  popover.set_parent(button);
  popover.set_has_arrow(false);
  popover.add_css_class('cc-detail-menu');
  popover.set_child(
    (
      <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
        <button
          class="cc-menu-btn"
          onClicked={() => {
            popover.popdown();
            onDisconnect();
          }}
        >
          <box spacing={8}>
            <LucideIcon name="unlink" pixelSize={16} />
            <label label="Disconnect" />
          </box>
        </button>
        <button
          class="cc-menu-btn cc-menu-danger"
          onClicked={() => {
            popover.popdown();
            onForget();
          }}
        >
          <box spacing={8}>
            <LucideIcon name="trash-2" pixelSize={16} />
            <label label={forgetLabel} />
          </box>
        </button>
      </box>
    ) as Gtk.Widget,
  );
  button.connect('clicked', () => popover.popup());
  button.connect('destroy', () => {
    popover.popdown();
    if (popover.get_parent()) popover.unparent();
  });
  return button;
}

export function ErrorLabel({
  error,
  onRetry,
}: {
  error: ReturnType<typeof createState<string>>[0];
  onRetry?: () => void;
}) {
  return (
    <revealer
      revealChild={error.as(Boolean)}
      transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
    >
      <box class="cc-connectivity-error" spacing={8}>
        <label label={error} wrap wrapMode={Pango.WrapMode.WORD_CHAR} maxWidthChars={32} hexpand />
        {onRetry && (
          <button class="cc-menu-btn" onClicked={onRetry}>
            <label label="Enter password" />
          </button>
        )}
      </box>
    </revealer>
  );
}
