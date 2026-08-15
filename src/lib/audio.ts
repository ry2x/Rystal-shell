export function getVolumeIcon(iconName: string) {
  if (iconName.includes('muted')) return 'volume-x';
  if (iconName.includes('high')) return 'volume-2';
  if (iconName.includes('medium')) return 'volume-1';
  if (iconName.includes('low')) return 'volume';
  return 'volume-x';
}
