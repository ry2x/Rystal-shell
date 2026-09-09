import {createState} from 'ags';
import {type Timer, timeout} from 'ags/time';

import Hyprland from 'gi://AstalHyprland';

const OSD_TIMEOUT_MS = 1500;
const OSD_HIDE_DURATION_MS = 200;

interface OsdContentBase {
  value: number;
  monitorConnector: string;
}

interface VolumeOsdContent extends OsdContentBase {
  kind: 'volume';
  muted: boolean;
}

interface BrightnessOsdContent extends OsdContentBase {
  kind: 'brightness';
}

interface MicrophoneOsdContent extends OsdContentBase {
  kind: 'microphone';
  muted: boolean;
}

type OsdContent = VolumeOsdContent | BrightnessOsdContent | MicrophoneOsdContent;

const [contentState, setContent] = createState<OsdContent | null>(null);
const [visibleState, setVisible] = createState(false);
const [revealedState, setRevealed] = createState(false);

export const osdContent = contentState;
export const osdVisible = visibleState;
export const osdRevealed = revealedState;

let expiryTimer: Timer | null = null;
let hideTimer: Timer | null = null;

function clampValue(value: number) {
  return Math.max(0, Math.min(1, value));
}

function resolveMonitorConnector(monitorConnector?: string | null) {
  return monitorConnector || Hyprland.get_default().get_focused_monitor().name;
}

function cancelTimers() {
  expiryTimer?.cancel();
  hideTimer?.cancel();
  expiryTimer = null;
  hideTimer = null;
}

function showOsd(content: OsdContent) {
  cancelTimers();
  setContent(content);
  setVisible(true);
  setRevealed(true);

  expiryTimer = timeout(OSD_TIMEOUT_MS, () => {
    expiryTimer = null;
    setRevealed(false);
    hideTimer = timeout(OSD_HIDE_DURATION_MS, () => {
      hideTimer = null;
      setVisible(false);
      setContent(null);
    });
  });
}

export function showVolumeOsd(value: number, muted: boolean, monitorConnector?: string | null) {
  showOsd({
    kind: 'volume',
    value: clampValue(value),
    muted,
    monitorConnector: resolveMonitorConnector(monitorConnector),
  });
}

export function showBrightnessOsd(value: number, monitorConnector?: string | null) {
  showOsd({
    kind: 'brightness',
    value: clampValue(value),
    monitorConnector: resolveMonitorConnector(monitorConnector),
  });
}

export function showMicrophoneOsd(value: number, muted: boolean, monitorConnector?: string | null) {
  showOsd({
    kind: 'microphone',
    value: clampValue(value),
    muted,
    monitorConnector: resolveMonitorConnector(monitorConnector),
  });
}

export function cleanupOsd() {
  cancelTimers();
  setRevealed(false);
  setVisible(false);
  setContent(null);
}
