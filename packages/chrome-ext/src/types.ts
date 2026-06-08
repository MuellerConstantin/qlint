export type Status = 'active' | 'inactive' | 'errored' | 'loading' | 'not-granted' | 'unsupported';

export type StatusMessage = { type: 'qlint:status'; status: Status };
export type LocationChangeMessage = { type: 'qlint:location-change' };
export type GetStatusMessage = { type: 'qlint:get-status' };
export type Message = StatusMessage | LocationChangeMessage | GetStatusMessage;
