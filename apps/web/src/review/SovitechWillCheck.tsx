/**
 * "SOVITECH will check" on the review step (guardrails rule 7: "Engineer items, one line per group";
 * 2.8 "Site survey needed (under SOVITECH will check)"; section 5,
 * step 8; G7-5, G1-7; US-REVIEW-12 AC2, AC4; steps.ts `sovitechWillCheck`). Each group is one served
 * line display object, its count bound to its value id; the owner is asked nothing here and nothing
 * here is counted among the owner's items (AC7).
 *
 * Also the revision notices of 2.3 ("Changes are announced": "<revision> changed <n> values"; R-048; G4-13):
 * one notice per declared revision that changed values, bound, with the changed values listed through
 * the Value component.
 */
import { StatusLine, Value } from '@sovitech/ui';
import type { StepView } from '@sovitech/view-model/browser';
import { useId } from 'react';
import { copy } from '../copy';
import type { Displays } from '../wizard/use-step-view';

export function SovitechWillCheck({ lines, displays }: { readonly lines: readonly string[]; readonly displays: Displays }) {
  const titleId = useId();
  const shown = lines.flatMap((valueId) => {
    const display = displays.get(valueId);
    return display === undefined ? [] : [display];
  });
  if (shown.length === 0) return null;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="sov-heading-section">
        {copy.step8.sovitechWillCheck}
      </h2>
      <ul className="flex list-none flex-col">
        {shown.map((display) => (
          <li key={display.valueId} className="border-t border-(--sov-border) py-4">
            <StatusLine display={display} />
          </li>
        ))}
      </ul>
    </section>
  );
}

type RevisionNotice = Extract<StepView, { step: 8 }>['revisionNotices'][number];

export function RevisionNotices({ notices, displays }: { readonly notices: readonly RevisionNotice[]; readonly displays: Displays }) {
  const titleId = useId();
  if (notices.length === 0) return null;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h2 id={titleId} className="sov-heading-section">
        {copy.step8.revisionHeading}
      </h2>
      {notices.map((notice) => {
        const line = displays.get(notice.notice);
        return (
          <div key={notice.notice} className="flex flex-col gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) px-6 py-5">
            {line === undefined ? null : <StatusLine display={line} />}
            <ul className="grid list-none grid-cols-3 gap-6">
              {notice.changed.map((valueId) => {
                const display = displays.get(valueId);
                return display === undefined ? null : (
                  <li key={valueId}>
                    <Value display={display} />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
