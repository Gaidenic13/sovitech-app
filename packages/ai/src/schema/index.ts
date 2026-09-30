/**
 * The AI output schemas (guardrails section 6, "AI boundary"). Every file of this
 * folder is part of the schema hash (tools/checks/index/eval-runs.ts, AI_SCHEMA_DIR).
 */
export * from './common';
export * from './extraction';
export * from './drafting';
