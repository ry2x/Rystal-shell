export type ResponseCallback = (response: string) => void;

export type IpcCommandHandler = (args: string[], response: ResponseCallback) => void;
