// Seeded bad input (TEST): technical attribute names on custom components are props the component renders
// (phase 0 round 2 review: type, name, id, role and the like were skipped on every element).
const Badge = (p: { type: string; name?: string; id?: string }) => <span>{p.type} {p.name} {p.id}</span>;
declare const issued: boolean;
declare const ui: { Stamp: (p: { role: string }) => null };
export const X = () => (
  <div>
    <Badge type="verified" name="Guaranteed" />
    <Badge type={issued ? 'binding' : 'draft'} id={'Certified'} />
    <ui.Stamp role="Final" />
  </div>
);
