/**
 * Late findings (guardrails rule 7, "Late findings never interrupt"; G7-4; US-INTAKE-19,
 * US-INTAKE-01 AC7, US-SCOPE-01 AC11; F-QUESTION-09; PRD R-004).
 * docs/adr/0039-wizard-navigation-saving-and-late-findings.md.
 *
 * The web keeps, for the page session, a ledger of the steps the owner has left and when (the
 * `asOf` of the step view on screen when they left it; nothing is stored on the server: PRD R-009
 * "Until decided", no resume state). It polls this route while the wizard is open and sends the
 * ledger. The server answers, from stored state only:
 * - `dots`: each left step (other than the one on screen) whose fields gained a finding after the
 *   owner left it: a new eligible candidate that is not the owner's own (`document`,
 *   `ai_inference`, `calculated`, `estimated`, `reference`), or a conflict whose newest candidate
 *   arrived after (rule 4). Which step a field belongs to is the registry question's step; step 3
 *   holds the building facts; step 2 gets no dot (its file list updates when visited);
 * - `notice`: one quiet notice for everything that arrived since the previous poll (`since`) on
 *   left steps, "We found <n> more things in your documents. You'll see them on the review step.",
 *   as a display object with its count bound (rule 7; US-INTAKE-19 AC3, AC4); null when nothing
 *   arrived or on the first poll.
 * The web never opens a dialog, never moves the owner and never changes an answer for a finding
 * (G7-4). The notice is a polite live region the owner may dismiss. The findings themselves join
 * step 8's lists through the field states (review items), not through this route.
 */
import { z } from 'zod';
import { IsoTimestampSchema, StepNumberSchema } from './common';
import { DisplayObjectsSchema, ValueIdSchema } from './display';

/** One entry of the ledger in the query: `<step>@<ISO timestamp>`, repeated as `left=`. */
export const LEFT_STEP_PATTERN = /^[1-8]@\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

export const LateFindingsQuerySchema = z.strictObject({
  /** The step on screen: it never gets a dot (the owner sees its rows update in place, US-REVIEW-09 AC2). */
  current: z.string().regex(/^[1-8]$/u),
  since: IsoTimestampSchema.optional(),
  left: z.union([z.string().regex(LEFT_STEP_PATTERN), z.array(z.string().regex(LEFT_STEP_PATTERN))]).optional(),
});

export const LateFindingsResponseSchema = z.strictObject({
  asOf: IsoTimestampSchema,
  displayObjects: DisplayObjectsSchema,
  dots: z.array(StepNumberSchema),
  notice: ValueIdSchema.nullable(),
});
export type LateFindingsResponse = z.infer<typeof LateFindingsResponseSchema>;

/** How often the web asks, in milliseconds, while a wizard step is on screen. */
export const LATE_FINDINGS_POLL_MS = 10_000;
