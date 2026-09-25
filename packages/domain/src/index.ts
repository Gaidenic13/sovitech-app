/**
 * @sovitech/domain: the value model of docs/guardrails.md section 2.
 *
 * Types, the one derive function, events, asset identity and the conflict test
 * live here (prompt 3 section 6). The domain depends on no other package: the
 * registry implements the field and unit shapes declared here and is handed in
 * as lookups, never imported. Phase 1 built derive, the conflict test, owner
 * corrections, document status, the revision change notice, asset identity and
 * check 1 of the evidence verifier; the rest of the verifier throws
 * NotImplementedError until phase 2.
 */
export * from './model';
export * from './decimal';
export * from './time';
export * from './conflict';
export * from './documents';
export * from './field-state';
export * from './correction';
export * from './revision-notice';
export * from './assets';
export * from './evidence';
export * from './not-implemented';
