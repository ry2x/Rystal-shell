export type {ControlCenterPage} from '../../../../../stores/panel/controlCenter';

export interface Confirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}
