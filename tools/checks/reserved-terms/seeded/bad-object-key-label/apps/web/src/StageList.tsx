// Seeded bad input (TEST): the objects of stage-copy.ts handed out with Object.keys, Object.entries and for-in.
import { ALL, BADGES as B, STAGE_LABELS } from './stage-copy';
export const StageList = () => <ul>{Object.keys(STAGE_LABELS).map((k) => <li key={k}>{k}</li>)}</ul>;
export const BadgeList = () => <ul>{Object.entries(B).map(([k]) => <li key={k}>{k}</li>)}</ul>;
export function names(): string[] {
  const out: string[] = [];
  for (const k in ALL) out.push(k);
  return out;
}
const local = { final: 1, draft: 2 };
export const localKeys = Object.keys(local);
