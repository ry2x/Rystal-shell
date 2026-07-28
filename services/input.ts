import { execAsync } from 'ags/process';

export function openFcitxConfig() {
  execAsync('fcitx5-configtool').catch(() => {});
}

export function reloadFcitx() {
  execAsync(['fcitx5-remote', '-r']).catch(() => {});
}

export function restartFcitx() {
  execAsync(['bash', '-c', 'fcitx5 -r']).catch(() => {});
}
