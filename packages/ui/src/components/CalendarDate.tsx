const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function twoDigits(part: number): string {
  return String(part).padStart(2, '0');
}

export interface CalendarDateProps {
  /** The day to show, in the owner's local calendar (the header shows today's date). */
  readonly date: Date;
}

/**
 * A calendar date as the render allowlist's `date-day-month-year` entry reads it (guardrails rule
 * 2: "dates and times"; US-INTAKE-01 AC1): `<time datetime="2026-09-30">30 Sep 2026</time>`, no
 * weekday, no time of day (a time needs an allowlist entry the approver has not added, proposal
 * P-3-HEADER-TIME), and no CSS that changes its case. Inter with tabular figures ("App theme":
 * the header date uses Inter, not a mono face).
 *
 * For today's date only. A date read from stored state (a revision date, a verification date) comes
 * formatted in a display object and renders through Value.
 */
export function CalendarDate({ date }: CalendarDateProps) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const iso = `${String(year)}-${twoDigits(month + 1)}-${twoDigits(day)}`;
  return (
    <time className="sov-date" dateTime={iso}>
      {`${String(day)} ${MONTHS[month] ?? ''} ${String(year)}`}
    </time>
  );
}
