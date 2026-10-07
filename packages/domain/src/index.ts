/**
 * @sovitech/domain: the value model of docs/guardrails.md section 2.
 *
 * Types, the one derive function, events, asset identity and the conflict test
 * live here (prompt 3 section 6). The domain depends on no other package: the
 * registry implements the field and unit shapes declared here and is handed in
 * as lookups, never imported. Phase 1 built derive, the conflict test, owner
 * corrections, document status, the revision change notice, asset identity and
 * check 1 of the evidence verifier; phase 2 built the rest of the verifier, and the
 * re-cap of an inference's confidence against the evidence that remains.
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
export * from './confidence';
export * from './calibration';
export * from './ifc-evidence';
export * from './not-implemented';
