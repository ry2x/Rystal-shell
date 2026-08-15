export type ControlCenterPage = 'main' | 'wifi' | 'bluetooth' | 'sound';

export interface Confirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}
