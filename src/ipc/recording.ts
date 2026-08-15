import { isRecording, startRecord, stopRecord } from '../stores/capture/recording';
import { type IpcCommandHandler, type ResponseCallback } from './types';

function start(mode: 'monitor' | 'slurp', response: ResponseCallback) {
  startRecord(mode);
  response(`Started recording in ${mode} mode`);
}

function stop(response: ResponseCallback) {
  stopRecord();
  response('Recording stopped');
}

export const handleRecord: IpcCommandHandler = (args, response) => {
  const action = args[0] ?? 'toggle';
  const mode = args[1] === 'slurp' ? 'slurp' : 'monitor';

  if (action === 'stop') {
    stop(response);
  } else if (action === 'start') {
    start(mode, response);
  } else if (action === 'toggle') {
    if (isRecording()) stop(response);
    else start(mode, response);
  } else {
    response('Usage: ags request "record [start|stop|toggle] [monitor|slurp]"');
  }
};
