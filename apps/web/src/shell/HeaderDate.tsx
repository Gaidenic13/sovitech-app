/**
 * Today's date in the header (US-INTAKE-01 AC1: "the current date … rendered live"; R-139: "each
 * project header shows … the current date"), through the kit's CalendarDate: a `<time>` element
 * whose text is its own `datetime` in the render allowlist's `D MMM YYYY` form (entry
 * `date-day-month-year`). No weekday and no time of day: the time needs an allowlist entry the
 * approver has not added (proposal P-3-HEADER-TIME), and the mockup's weekday was a slip
 * (onboarding-spec 6.1). The shown date changes only when the day does (checked once a minute), so
 * no number on screen moves otherwise (G2-8).
 */
import { useEffect, useState } from 'react';
import { CalendarDate } from '@sovitech/ui';

function dayKey(date: Date): string {
  return `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`;
}

export function HeaderDate() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setToday((previous) => (dayKey(previous) === dayKey(now) ? previous : now));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <CalendarDate date={today} />;
}
