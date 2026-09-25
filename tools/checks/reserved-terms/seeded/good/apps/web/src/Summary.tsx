// Seeded good input for the reserved-term self-test: nothing here may be flagged.
// Lower-case keys appear only in the positions that are never shown: types, property keys,
// ===/!== comparisons, switch cases and the registered lists STAGES and Verification.
type Stage = 'final' | 'draft';
export const STAGES = ['final', 'draft'] as const;
export enum Verification {
  Verified = 'verified',
  Unverified = 'unverified',
}
export const isClosed = (stage: Stage): boolean => stage === 'final';
export const isOpen = (stage: Stage): boolean => 'final' !== stage;
export function tone(stage: Stage): string {
  switch (stage) {
    case 'final':
      return 'muted';
    default:
      return 'plain';
  }
}
export const byStage: Record<Stage, number> = { final: 1, 'draft': 2 };
export const computedKeys = { ['verified']: true };
export const lookup = byStage['final'];
export const event = { type: 'user_confirmed' };
export const badge = 'Verified by SOVITECH';
export const sourceLine = (date: string) => `AI inference, verified by SOVITECH on ${date}`;
export const Summary = () => (
  <section className="final-step firm-price">
    <h2>Unconfirmed items</h2>
    <button type="button">Confirm</button>
  </section>
);
