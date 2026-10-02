/**
 * What System Scope, Equipment and the asset record share to show the registers' values (PRD R-052, R-065 to R-068;
 * guardrails rules 1, 2 and 7):
 *
 * - `RegisterValue`: one served display, through the kit: a "Not available yet" line names what is missing (rule 7:
 *   "never appears alone"), a status line through StatusLine (at the size its context sets: a document's coverage
 *   under a 14px file name is set small, DR-10), every other display through the one Value component with its badge
 *   on its line (2.8).
 *   Nothing here formats, counts or fills a value: what shows is what the API served (rule 2).
 *
 * The floor filter every register page shares is `FloorFilter` (../topology/ViewFilter.tsx; DR-5).
 */
import { NotAvailableYet, StatusLine, Value, type StatusLineProps } from '@sovitech/ui';
import type { DisplayObject } from '@sovitech/view-model/browser';

export interface RegisterValueProps {
  readonly display: DisplayObject | undefined;
  /** The size of a standalone line (StatusLine's), where its context sets a smaller one. */
  readonly lineSize?: StatusLineProps['size'];
}

/**
 * One served display: "Not available yet" with what is missing; a standalone line with no badge (a document's
 * coverage or status line) through StatusLine, bound; every other display through the Value component, bare.
 */
export function RegisterValue({ display, lineSize }: RegisterValueProps) {
  if (display === undefined) return null;
  if (display.missing === 'not_available_yet') return <NotAvailableYet display={display} />;
  if (display.kind === 'line' && display.badge === undefined) return <StatusLine display={display} {...(lineSize === undefined ? {} : { size: lineSize })} />;
  return <Value display={display} layout="bare" />;
}
