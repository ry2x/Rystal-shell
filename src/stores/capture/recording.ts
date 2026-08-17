import {createState} from 'ags';
import {subprocess} from 'ags/process';

import Hyprland from 'gi://AstalHyprland';
import Wp from 'gi://AstalWp';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {appConfig} from '@/lib/config';
import {sendNotification} from '@/stores/notification/send';

const [isRecordingState, setIsRecording] = createState(false);
export const isRecording = isRecordingState;

export type RecordingMode = 'monitor' | 'slurp';

export type RecordingStartResult =
  | {status: 'started'; path: string}
  | {status: 'already-active'}
  | {status: 'cancelled'}
  | {status: 'failed'; error: string};

export type RecordingStopResult =
  | {status: 'stopping'}
  | {status: 'not-recording'}
  | {status: 'already-stopping'}
  | {status: 'failed'; error: string};

const SIGINT = 2;
const SIGKILL = 9;

interface ActiveRecording {
  process: ReturnType<typeof subprocess>;
  path: string;
  stopRequested: boolean;
  stderrLines: string[];
}

interface RecordingStartSession {
  process: Gio.Subprocess | null;
  cancelled: boolean;
}

let activeRecording: ActiveRecording | null = null;
let activeStartSession: RecordingStartSession | null = null;
let shuttingDown = false;

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
    (!signaled && code === 0) ||
    (recording.stopRequested && signaled && (code === SIGINT || code === SIGKILL));

  if (stoppedNormally) {
    sendNotification({
      summary: 'Recording saved',
      body: `Saved to ${recording.path}`,
    });
    return;
  }

  const detail =
    recording.stderrLines.slice(-5).join('\n') ||
    `wf-recorder exited with ${signaled ? 'signal' : 'code'} ${code}`;
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
  const speakerName = speaker?.get_pw_property('node.name')?.trim() || speaker?.name?.trim();
  if (!speakerName) throw new Error('Default speaker has no PipeWire node name');
  cmd.push(`--audio=${speakerName}.monitor`);
}

async function addCaptureTarget(
  cmd: string[],
  mode: RecordingMode,
  session: RecordingStartSession
): Promise<RecordingStartResult | null> {
  if (mode === 'monitor') {
    const monitor = Hyprland.get_default().get_focused_monitor();
    if (!monitor) {
      const error = 'No focused monitor found for recording';
      console.error(error);
      notifyFailure(error);
      return {status: 'failed', error};
    }
    cmd.push('-o', monitor.name);
    return null;
  }

  const process = Gio.Subprocess.new(
    ['slurp'],
    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
  );
  session.process = process;
  let stderr = '';

  const result = await new Promise<RecordingStartResult | null>((resolve, reject) => {
    process.communicate_utf8_async(null, null, (_, asyncResult) => {
      if (session.process === process) session.process = null;

      try {
        const [, stdout, processStderr] = process.communicate_utf8_finish(asyncResult);
        if (session.cancelled) {
          resolve({status: 'cancelled'});
          return;
        }

        stderr = processStderr.trim();
        const region = stdout.trim();
        if (!process.get_successful() || !region) {
          resolve({status: 'cancelled'});
          return;
        }

        cmd.push('--geometry', region);
        resolve(null);
      } catch (error) {
        if (session.cancelled) resolve({status: 'cancelled'});
        else reject(error);
      }
    });
  });

  if (result?.status === 'cancelled' && !session.cancelled) {
    if (stderr) console.warn(`Slurp cancelled: ${stderr}`);
    sendNotification({
      summary: 'Recording cancelled',
      body: 'Selection was cancelled',
      transient: true,
    });
  }
  return result;
}

export async function startRecord(mode: RecordingMode): Promise<RecordingStartResult> {
  if (shuttingDown) return {status: 'failed', error: 'Application is shutting down'};
  if (activeRecording || activeStartSession) return {status: 'already-active'};

  const session: RecordingStartSession = {process: null, cancelled: false};
  activeStartSession = session;

  try {
    const fullPath = getRecordingPath();
    const cmd = ['wf-recorder', '--pixel-format', 'yuv420p', '-f', fullPath];
    addAudioOptions(cmd);
    const targetResult = await addCaptureTarget(cmd, mode, session);
    if (targetResult) return targetResult;
    if (session.cancelled || shuttingDown) return {status: 'cancelled'};

    const process = subprocess({
      cmd,
      err: line => {
        const recording = activeRecording;
        if (recording?.process !== process) return;
        recording.stderrLines.push(line);
        if (recording.stderrLines.length > 20) recording.stderrLines.shift();
      },
    });

    const recording: ActiveRecording = {
      process,
      path: fullPath,
      stopRequested: false,
      stderrLines: [],
    };
    activeRecording = recording;
    process.connect('exit', (_, code, signaled) => finishRecording(recording, code, signaled));

    sendNotification({
      summary: 'Recording started',
      body: `Recording to ${fullPath}`,
      transient: true,
    });
    setIsRecording(true);
    return {status: 'started', path: fullPath};
  } catch (e) {
    console.error('Failed to start recording', e);
    const error = e instanceof Error ? e.message : String(e);
    notifyFailure(error);
    return {status: 'failed', error};
  } finally {
    if (activeStartSession === session) activeStartSession = null;
  }
}

export function stopRecord(): RecordingStopResult {
  const recording = activeRecording;
  if (!recording) return {status: 'not-recording'};
  if (recording.stopRequested) return {status: 'already-stopping'};

  recording.stopRequested = true;
  try {
    recording.process.signal(SIGINT);
    return {status: 'stopping'};
  } catch (error) {
    recording.stopRequested = false;
    console.error('Failed to stop recording', error);
    const detail = error instanceof Error ? error.message : String(error);
    notifyFailure(detail);
    return {status: 'failed', error: detail};
  }
}

export function cleanupRecording(): RecordingStopResult {
  shuttingDown = true;
  const startSession = activeStartSession;
  if (startSession) {
    startSession.cancelled = true;
    try {
      startSession.process?.force_exit();
    } catch (error) {
      console.error('Failed to cancel recording selection', error);
    }
  }

  const recording = activeRecording;
  if (!recording) return {status: 'not-recording'};

  recording.stopRequested = true;
  try {
    recording.process.kill();
    return {status: 'stopping'};
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Failed to terminate recording process', error);
    return {status: 'failed', error: detail};
  }
}
