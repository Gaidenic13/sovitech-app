// Seeded bad input (synthetic): a decimal built from text outside the rule 8 parser.
import Decimal from 'decimal.js';

export const pointsOf = (whole: string, fraction: string) => new Decimal(`${whole}.${fraction}`);
