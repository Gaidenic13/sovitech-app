/**
 * Each intake step's name, one map for the app (phase 6, DR-12): the document title of a step's page (../routes.tsx)
 * and the heading of each group of the stored proposal's "What the estimate is based on" (../proposal/StoredProposal.tsx),
 * which lists the inputs by the step they were answered on. Each step's own title from the catalogue; step 1, which
 * draws none, reads "Your project". No new copy.
 */
import type { StepNumber } from '@sovitech/view-model/browser';
import { copy } from '../copy';

export const STEP_PAGE_NAMES: Readonly<Record<StepNumber, string>> = {
  1: copy.titles.project,
  2: copy.step2.title,
  3: copy.step3.title,
  4: copy.step4.title,
  5: copy.step5.title,
  6: copy.step6.title,
  7: copy.step7.title,
  8: copy.step8.title,
};

/** A step's name (see the header). */
export function stepTitle(step: StepNumber): string {
  return STEP_PAGE_NAMES[step];
}
