import {Accessor, type CCProps} from 'ags';
import {Gtk} from 'ags/gtk4';

type ImageProps = Omit<
  CCProps<Gtk.Image, Partial<Gtk.Image.ConstructorProps>>,
  'children' | 'iconName' | 'name'
>;

export interface LucideIconProps extends ImageProps {
  name: string | Accessor<string>;
  class?: string | Accessor<string>;
  css?: string | Accessor<string>;
}

/**
 * Helper function to get the symbolic icon name for a lucide icon.
 * @param name The icon name (e.g., "activity", "check-circle")
 * @returns The symbolic icon name
 */
function lucideIcon(name: string): string {
  return `lucide-${name}-symbolic`;
}

/**
 * LucideIcon component that correctly utilizes GTK's IconTheme via iconName.
 * This allows SCSS states (like :hover, color changes) and dynamic binding updates to work perfectly.
 */
export function LucideIcon({name, ...props}: LucideIconProps) {
  const icon = name instanceof Accessor ? name.as(lucideIcon) : lucideIcon(name);

  return <image iconName={icon} {...props} />;
}
