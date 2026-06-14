import type { Severity } from '@qlint/core';

export type DiagnosticCounts = Record<Severity, number>;

export type Status = 'active' | 'inactive' | 'errored' | 'loading' | 'not-granted' | 'unsupported';

export type StatusMessage = { type: 'qlint:status'; status: Status };
export type DiagnosticsMessage = { type: 'qlint:diagnostics'; counts: DiagnosticCounts; fixable: number };
export type LocationChangeMessage = { type: 'qlint:location-change' };
export type GetStatusMessage = { type: 'qlint:get-status' };
export type GetDiagnosticsMessage = { type: 'qlint:get-diagnostics' };
export type FixAllMessage = { type: 'qlint:fix-all' };
export type Message =
  | StatusMessage
  | LocationChangeMessage
  | GetStatusMessage
  | GetDiagnosticsMessage
  | DiagnosticsMessage
  | FixAllMessage;

export type DiagnosticsBridgeMessage = {
  source: 'qlint-main';
  type: 'qlint:diagnostics';
  counts: DiagnosticCounts;
  fixable: number;
};
export type FixAllBridgeMessage = { source: 'qlint-content'; type: 'qlint:fix-all' };
export type BridgeMessage = DiagnosticsBridgeMessage | FixAllBridgeMessage;
