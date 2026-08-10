/**
 * Helper function to get the symbolic icon name for a lucide icon.
 * @param name The icon name (e.g., "activity", "check-circle")
 * @returns The symbolic icon name
 */
function lucideIcon(name: string): string {
  // Prefix with 'lucide-' to prevent collisions with system GTK icons like Adwaita
  return `lucide-${name}-symbolic`;
}

/**
 * LucideIcon component that correctly utilizes GTK's IconTheme via iconName.
 * This allows SCSS states (like :hover, color changes) and dynamic binding updates to work perfectly.
 */
export function LucideIcon({ name, ...props }: { name: string | unknown; [key: string]: unknown }) {
  // Check if name is a reactive binding/accessor (has an .as method)
  const icon =
    name && typeof (name as { as?: (...args: unknown[]) => unknown }).as === 'function'
      ? (name as { as: (fn: (n: string) => string) => string }).as((n: string) => lucideIcon(n))
      : lucideIcon(name as string);

  return <image iconName={icon} {...props} />;
}
