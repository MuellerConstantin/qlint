export type Phase = 'active' | 'inactive';

export type PhaseMessage = { type: 'qlint:phase'; phase: Phase };
export type LocationChangeMessage = { type: 'qlint:locationchange' };
export type Message = PhaseMessage | LocationChangeMessage;
