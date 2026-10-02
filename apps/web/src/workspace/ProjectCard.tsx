/**
 * The project card at the foot of the sidebar (PRD R-049; US-REVIEW-14; dashboards 7.1-r7, 7.1.1-E3):
 * the building's key facts as `workspace.frame` serves them, each through the kit's Value component
 * with its one badge and its source line, under the label of what it measures (rule 8): the project
 * type (the step 1 answer), the building type, the gross floor area with its basis, the rooms with
 * what they count, and the floors by level type. They are the same value ids as step 3 and step 8, so
 * each shows the identical display there and here (G2-7).
 *
 * Not on the card (R-049; US-REVIEW-14 AC6 to AC8): no photo presented as the building (proposal
 * 7.2.9), no Status or project-phase line (7.2.11), no "BMS Platform" (7.2.10), no currency while no
 * price exists. A fact with no eligible candidate reads Unknown or Not provided yet, as served, never a
 * zero, a blank or a dash (AC10).
 */
import type { ProjectCard as ProjectCardView } from '@sovitech/view-model/browser';
import { Value } from '@sovitech/ui';
import type { Displays } from '../wizard/use-step-view';

export function ProjectCard({ card, displays, headingId, heading }: { readonly card: ProjectCardView; readonly displays: Displays; readonly headingId: string; readonly heading: string }) {
  const ids = [card.projectType, card.buildingType, card.grossFloorArea, ...card.rooms, ...card.floors];
  const facts = ids.flatMap((valueId) => {
    const display = displays.get(valueId);
    return display === undefined ? [] : [display];
  });
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-[12px] font-semibold tracking-[0.08em] text-(--sov-text-muted) uppercase">
        {heading}
      </h2>
      {/* The sidebar is narrow: each fact is its own tile, its badge moving under its text in the same tile where the
          two do not fit on one line (2.8 "Prominence": "on the same line or tile as its figure"), never squeezed letter
          by letter. The kit's `.sov-workspace__sidebar .sov-value__line` rule does it (packages/ui/src/ui.css). */}
      <ul className="flex flex-col gap-4 text-[13px]">
        {facts.map((display) => (
          <li key={display.valueId}>
            <Value display={display} layout="stack" />
          </li>
        ))}
      </ul>
    </section>
  );
}
