// Seeded bad input (TEST): tagged templates (phase 0 round 2 review: their text was never read).
const t = (s: TemplateStringsArray, ...v: unknown[]): string => s.join(String(v.length));
export const a = t`Final price, verified`;
export const b = String.raw`Certified compliant`;
export const c = t`Oferta ferma ${1} garantat`;
