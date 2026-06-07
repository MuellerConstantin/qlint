export type Phase = 'active' | 'inactive';

export type PhaseMessage = { type: 'qlint:phase'; phase: Phase };
export type LocationChangeMessage = { type: 'qlint:location-change' };
export type GetPhaseMessage = { type: 'qlint:get-phase' };
export type Message = PhaseMessage | LocationChangeMessage | GetPhaseMessage;
