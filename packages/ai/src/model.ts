/**
 * The model the in-app AI uses, and the request settings that go with it
 * (docs/adr/0021-anthropic-sdk-and-model.md; build-readiness 3 "Now" item 6).
 *
 * MODEL_ID is the owner's decision of 2026-09-25 ("claude-opus-5-5 (Recommended)";
 * docs/build-log.md, "Owner answers during the run"). This is the one place the id
 * is written: the transport sends it, every candidate the AI proposes carries the id
 * the API returned (and a response naming another model is refused), every eval
 * results record names it, and the index check reads this line
 * (tools/checks/index/eval-runs.ts, AI_MODEL_FILE). Changing it runs the guardrail
 * evals again, 5 samples each, 5 of 5 to pass (CLAUDE.md, definition of done item 2).
 */
export const MODEL_ID = 'claude-opus-5-5';

/**
 * Effort, set on every request: this model's default is `medium`, and extraction and
 * drafting under the guardrails are intelligence-sensitive work (the claude-api skill,
 * "Choosing an effort level"). Thinking is left adaptive (the model cannot switch it off).
 */
export const EFFORT = 'high' as const;

/** Room for adaptive thinking and the structured output together; the transport streams. */
export const MAX_TOKENS = 64_000;

/** The only API host the boundary talks to. ANTHROPIC_BASE_URL is never read (ADR 0021). */
export const API_BASE_URL = 'https://api.anthropic.com';
