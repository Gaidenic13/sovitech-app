// Seeded bad input (TEST): labels held as object keys and shown by iterating the object
// (phase 0 round 2 review: every string key passed as a key position).
export const STAGE_LABELS = { 'Formal quotation': 3, 'Firm price': 2, ['Guaranteed savings']: 1 };
export const BADGES = { Verified: 'tone-a', Certified: 'tone-b' };
const EXTRA = { Binding: 1 };
export const ALL = { ...EXTRA, plain: 2 };
// Never iterated, but a key written as display text is copy wherever it stands.
export const LOOKUP = { 'Oferta ferma': 'TEST' };
