import { isRecording, startRecord, stopRecord } from '../stores/capture/recording';
import { type IpcCommandHandler, type ResponseCallback } from './types';

async function start(mode: 'monitor' | 'slurp', response: ResponseCallback) {
  const result = await startRecord(mode);
  switch (result.status) {
    case 'started':
      response(`Started recording in ${mode} mode: ${result.path}`);
      break;
    case 'already-active':
      response('Recording is already active or starting');
      break;
    case 'cancelled':
      response('Recording cancelled');
      break;
    case 'failed':
      response(`Failed to start recording: ${result.error}`);
      break;
  }
}

function stop(response: ResponseCallback) {
  const result = stopRecord();
  switch (result.status) {
    case 'stopping':
      response('Stopping recording');
      break;
    case 'not-recording':
      response('No recording is active');
      break;
    case 'already-stopping':
      response('Recording is already stopping');
      break;
    case 'failed':
      response(`Failed to stop recording: ${result.error}`);
      break;
  }
}

export const handleRecord: IpcCommandHandler = (args, response) => {
  const action = args[0] ?? 'toggle';
  const mode = args[1] === 'slurp' ? 'slurp' : 'monitor';

  if (action === 'stop') {
    stop(response);
  } else if (action === 'start') {
    void start(mode, response);
  } else if (action === 'toggle') {
    if (isRecording()) stop(response);
    else void start(mode, response);
  } else {
    response('Usage: ags request "record [start|stop|toggle] [monitor|slurp]"');
  }
};
