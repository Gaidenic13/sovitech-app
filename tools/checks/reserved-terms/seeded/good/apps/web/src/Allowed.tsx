// Seeded good input (TEST), added after the phase 0 round 2 review: positions that stay unflagged.
// An iterated object whose keys hold no reserved term, and a lower-case key of an object nobody iterates.
const GROUPS = { draft: 1, issued: 2 };
export const groupNames = Object.keys(GROUPS);
export const lookup = { final: 'tone-muted', 'user_confirmed': 'tone-plain' };
// A display-shaped key with no reserved term, and a type-level key.
export const headers = { 'Content-Type': 'text/plain' };
export interface Shape {
  readonly 'Final prop': string;
}
// A tagged template with no reserved term.
declare const css: (s: TemplateStringsArray) => string;
export const rule = css`color: inherit;`;
// key and ref are never props; technical attributes on intrinsic elements hold no copy.
declare const Row: (p: { label: string }) => null;
export const List = () => (
  <ul>
    <Row key="final" label="Draft" />
    <input type="text" name="firm-price-input" id="final-area" data-value-id="building:demo.area" />
  </ul>
);
