/**
 * Event and candidate times. The store writes times with six
 * fractional digits (microseconds); `Date.parse` keeps milliseconds only, so two
 * times 0.8 ms apart could read as equal and a candidate created after a
 * resolution could read as one the resolution saw (phase 1 adversarial finding
 * on resolution coverage). Times here are compared to the nanosecond.
 */

/** An ISO 8601 date-time with an optional fraction of a second and a zone. */
const ISO_TIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9})\d*)?(Z|[+-]\d{2}:\d{2})$/u;

const NANOS_PER_MILLI = 1_000_000n;

/** Nanoseconds since the epoch, or null for text that is not an ISO date-time. */
export function timeInNanos(iso: string): bigint | null {
  const match = ISO_TIME.exec(iso);
  const seconds = match?.[1];
  const zone = match?.[3];
  if (seconds === undefined || zone === undefined) return null;
  const whole = Date.parse(`${seconds}${zone}`);
  if (Number.isNaN(whole)) return null;
  const fraction = (match?.[2] ?? '').padEnd(9, '0');
  return BigInt(whole) * NANOS_PER_MILLI + BigInt(fraction);
}

/**
 * Compares two times: negative when `a` is earlier, positive when later, zero
 * when equal; null when either is not an ISO date-time, so a caller never reads
 * an unparsed time as earlier or later.
 */
export function compareTimes(a: string, b: string): number | null {
  const ta = timeInNanos(a);
  const tb = timeInNanos(b);
  if (ta === null || tb === null) return null;
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/** Oldest first; text order where a time does not parse, so the order stays total. */
export function olderFirst(a: string, b: string): number {
  const order = compareTimes(a, b);
  return order === null ? a.localeCompare(b) : order;
}

/** Whether `earlier` is at or before `later`. A time that does not parse is never at or before anything. */
export function atOrBefore(earlier: string, later: string): boolean {
  const order = compareTimes(earlier, later);
  return order !== null && order <= 0;
}
