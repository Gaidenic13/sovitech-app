/**
 * @sovitech/domain: the value model of docs/guardrails.md section 2.
 *
 * Types, the one derive function, events, asset identity and the conflict test
 * live here (prompt 3 section 6). Phase 0 declares the interfaces that the
 * field-state and evidence tests in tests/guardrails/ are written against; their
 * bodies throw NotImplementedError until phase 1 (derive) and phase 2 (the
 * evidence verifier) build them.
 */
export * from './model';
export * from './field-state';
export * from './evidence';
export * from './not-implemented';
