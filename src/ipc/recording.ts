import {type IpcCommand, IpcUsageError} from '@/lib/ipcCommand';
import {type RecordingMode, isRecording, startRecord, stopRecord} from '@/stores/capture/recording';

function parseRecordingMode(value: string | undefined): RecordingMode {
  if (value === undefined || value === 'monitor' || value === 'slurp') return value ?? 'monitor';
  throw new IpcUsageError('Recording mode must be "monitor" or "slurp".');
}

async function start(mode: RecordingMode) {
  const result = await startRecord(mode);
  switch (result.status) {
    case 'started':
      return `Started recording in ${mode} mode: ${result.path}`;
    case 'already-active':
      return 'Recording is already active or starting';
    case 'cancelled':
      return 'Recording cancelled';
    case 'failed':
      return `Failed to start recording: ${result.error}`;
  }
  throw new Error('Unknown recording start result');
}

function stop() {
  const result = stopRecord();
  switch (result.status) {
    case 'stopping':
      return 'Stopping recording';
    case 'not-recording':
      return 'No recording is active';
    case 'already-stopping':
      return 'Recording is already stopping';
    case 'failed':
      return `Failed to stop recording: ${result.error}`;
  }
  throw new Error('Unknown recording stop result');
}

const recordingCommand: IpcCommand = {
  name: 'record',
  description: 'Start, stop, or toggle screen recording.',
  defaultSubcommand: 'toggle',
  subcommands: [
    {
      name: 'start',
      description: 'Start screen recording.',
      usage: '[monitor|slurp]',
      maxArgs: 1,
      execute: args => start(parseRecordingMode(args[0])),
    },
    {
      name: 'stop',
      description: 'Stop the active recording.',
      execute: stop,
    },
    {
      name: 'toggle',
      description: 'Start recording or stop the active recording.',
      usage: '[monitor|slurp]',
      maxArgs: 1,
      execute(args) {
        return isRecording() ? stop() : start(parseRecordingMode(args[0]));
      },
    },
  ],
};

export const recordingCommands: readonly IpcCommand[] = [recordingCommand];
