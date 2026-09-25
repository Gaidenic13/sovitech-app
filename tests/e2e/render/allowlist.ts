/**
 * The render test's reviewed allowlist: the ONE list of digits that may appear outside an
 * element carrying a value id (guardrails rule 2, "Render test"; prompt 3 section 7), and the
 * reviewed list of elements whose pixels the test cannot read.
 *
 * Rules for this file (docs/adr/0006-render-test.md):
 * - `entries`: only rule 2's four categories: dates and times, step numbers, character
 *   counters, and fixed interface copy with no engineering meaning. A new category is a
 *   loosening (guardrails section 10): propose it, never add it.
 * - Each entry names its category, the reason its digits carry no stored-state meaning,
 *   and its source. The owner reviews every entry, so each one added is listed in
 *   docs/build-log.md.
 * - A step-number entry registers one stepper container (`data-render-stepper="<id>"`, an
 *   `<ol>` of exactly `steps` `<li>` items) and the title of each step; a step number is
 *   accepted only inside it, equal to its item's position, in an item that shows nothing but
 *   the number and its step's title.
 * - Digits the guardrails require (2.8 status lines, rule 7 counts), file names, revisions,
 *   tags and room or storey names never go here: they render inside a value element.
 * - Digits with no stored-state meaning (upload percentages, file sizes, pagination,
 *   numeric chart ticks) are not shown at all; allowing them is proposal 7.2.30 (D-54).
 * - `unreadable`: canvas, img, video, embed, object, SVG image, image input, CSS images and
 *   inline SVG drawings larger than an icon with no text fail the render test, because it
 *   cannot read their pixels, unless the element carries
 *   `data-render-unreadable="<id>"` naming an entry here. Each entry says why its pixels hold
 *   no number. At phase 0 it holds the brand logo, which the placeholder page shows; the
 *   model viewer's canvas is added by the phase that builds it. Each entry is listed in
 *   docs/build-log.md for the owner.
 * - tools/checks/render validates this file (`pnpm checks`), and G2-1 checks that every
 *   entry is used by the clean harness page.
 *
 * Started 2026-09-25 with only what the harness pages need.
 */
import type { Allowlist } from './contract';

export const RENDER_ALLOWLIST = {
  entries: [
    {
      id: 'date-day-month-year',
      category: 'date_time',
      format: 'D MMM YYYY',
      reason:
        'A calendar date written inside a <time> element whose text is its own datetime attribute. It dates an event (an upload, a change) and states no quantity.',
      source: 'guardrails rule 2 ("dates and times"); 2.8 status line "Superseded: inputs changed on <date>"',
    },
    {
      id: 'wizard-step-number',
      category: 'step_number',
      pattern: '^[1-8]$',
      steps: 8,
      titles: ['Project', 'Documents', 'Building', 'Systems', 'Operations', 'Goals', 'Automation', 'Proposal'],
      reason:
        'The position of a wizard step in the stepper. The wizard has eight steps, so the number names a step and counts nothing in the building. An item shows its number and its step title only.',
      source:
        'guardrails rule 2 ("step numbers"); guardrails section 5 (steps 1-8); onboarding-spec 3 (stepper); step titles from docs/product/user-stories.md US-INTAKE-01 AC2 (OD-4)',
    },
    {
      id: 'character-counter',
      category: 'character_counter',
      format: '{count} / {max}',
      reason:
        'Characters typed in a text field against its maxlength, computed from the field itself. It describes the text being typed, not the building.',
      source: 'guardrails rule 2 ("character counters")',
    },
    {
      id: 'max-file-size',
      category: 'fixed_interface_copy',
      text: 'Max file size 500 MB',
      reason:
        'The upload limit line on step 2. It is fixed interface copy: the same on every project, set by the app, with no engineering meaning.',
      source:
        'guardrails rule 2 (named as an example of the reviewed list); onboarding-spec 3 (Step 2); prompt 3 section 5.2 ("500 MB limit": per file); PRD R-013',
    },
  ],
  unreadable: [
    {
      id: 'brand-logo',
      element: 'img',
      // The file itself (tests/e2e/pages/clean.html) or its build output (assets/logo-white-<hash>.svg).
      src: '(?:^|/)logo-white(?:-[A-Za-z0-9_-]+)?\\.svg$',
      reason:
        'The SOVITECH logo, drawn from packages/ui/src/brand/logo-white.svg. It draws the letters SOVITECH CONTROL, a fingerprint and a building as paths, with no text element and no number, and states nothing about the building.',
      source:
        'prompt 3 section 6 ("Brand assets"); packages/ui/src/brand/README.md (logo-white.svg, SHA-256 548759ec...); both logo files rendered and looked at on 2026-09-25',
    },
  ],
} as const satisfies Allowlist;
