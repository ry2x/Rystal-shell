import { createState } from 'ags';
import { execAsync, subprocess } from 'ags/process';

import Hyprland from 'gi://AstalHyprland';
import Wp from 'gi://AstalWp';
import GLib from 'gi://GLib';

import { appConfig } from '../../lib/config';
import { sendNotification } from '../../lib/notification';

const [isRecordingState, setIsRecording] = createState(false);
export const isRecording = isRecordingState;

export type RecordingMode = 'monitor' | 'slurp';

const SIGINT = 2;

interface ActiveRecording {
  process: ReturnType<typeof subprocess>;
  path: string;
  stopRequested: boolean;
  lastError: string;
}

let activeRecording: ActiveRecording | null = null;
let isStarting = false;

function notifyFailure(body: string) {
  sendNotification({
    summary: 'Recording failed',
    body,
  });
}

function finishRecording(recording: ActiveRecording, code: number, signaled: boolean) {
  if (activeRecording !== recording) return;

  activeRecording = null;
  setIsRecording(false);

  const stoppedNormally =
    (!signaled && code === 0) || (recording.stopRequested && signaled && code === SIGINT);

  if (stoppedNormally) {
    sendNotification({
      summary: 'Recording saved',
      body: `Saved to ${recording.path}`,
    });
    return;
  }

  const detail =
    recording.lastError || `wf-recorder exited with ${signaled ? 'signal' : 'code'} ${code}`;
  console.error(`Recording failed: ${detail}`);
  notifyFailure(detail);
}

function getRecordingPath() {
  const now = GLib.DateTime.new_now_local();
  const format = appConfig.recorder?.filenameFormat || 'recording_%Y-%m-%d_%H.%M.%S.mp4';
  const filename = now.format(format) || `recording_${Date.now()}.mp4`;

  let savePath = appConfig.recorder?.savePath || '~/Videos';
  if (savePath === '~' || savePath.startsWith('~/')) {
    savePath = `${GLib.get_home_dir()}${savePath.slice(1)}`;
  }
  savePath = GLib.canonicalize_filename(savePath, GLib.get_current_dir());

  if (GLib.mkdir_with_parents(savePath, 0o755) === -1) {
    throw new Error(`Failed to create directory: ${savePath}`);
  }

  return `${savePath}/${filename}`;
}

function addAudioOptions(cmd: string[]) {
  if (appConfig.recorder?.recordAudio === false) return;

  if (appConfig.recorder?.audioSource === 'mic') {
    cmd.push('-a');
    return;
  }

  const speaker = Wp.get_default().audio.get_default_speaker();
  cmd.push(speaker ? `--audio=${speaker.name?.trim()}.monitor` : '-a');
}

async function addCaptureTarget(cmd: string[], mode: RecordingMode) {
  if (mode === 'monitor') {
    const monitor = Hyprland.get_default().get_focused_monitor();
    if (monitor) {
      cmd.push('-o', monitor.name);
    } else {
      console.error('No focused monitor found for recording');
    }
    return true;
  }

  try {
    const region = await execAsync('slurp');
    cmd.push('--geometry', region.trim());
    return true;
  } catch (error) {
    console.warn('Cancelled Slurp [This is not an error. Emitted by user operation]', error);
    sendNotification({
      summary: 'Recording cancelled',
      body: 'Selection was cancelled',
      transient: true,
    });
    return false;
  }
}

export async function startRecord(mode: RecordingMode) {
  if (activeRecording || isStarting) return;
  isStarting = true;

  try {
    const fullPath = getRecordingPath();
    const cmd = ['wf-recorder', '--pixel-format', 'yuv420p', '-f', fullPath];
    addAudioOptions(cmd);
    if (!(await addCaptureTarget(cmd, mode))) return;

    const process = subprocess({
      cmd,
      err: (line) => {
        console.error(`wf-recorder: ${line}`);
        if (activeRecording?.process === process) activeRecording.lastError = line;
      },
    });

    const recording: ActiveRecording = {
      process,
      path: fullPath,
      stopRequested: false,
      lastError: '',
    };
    activeRecording = recording;
    process.connect('exit', (_, code, signaled) => finishRecording(recording, code, signaled));

    sendNotification({
      summary: 'Recording started',
      body: `Recording to ${fullPath}`,
      transient: true,
    });
    setIsRecording(true);
  } catch (e) {
    console.error('Failed to start recording', e);
    notifyFailure(e instanceof Error ? e.message : String(e));
  } finally {
    isStarting = false;
  }
}

export function stopRecord() {
  const recording = activeRecording;
  if (!recording || recording.stopRequested) return;

  recording.stopRequested = true;
  try {
    recording.process.signal(SIGINT);
  } catch (error) {
    recording.stopRequested = false;
    console.error('Failed to stop recording', error);
    notifyFailure(error instanceof Error ? error.message : String(error));
  }
}
