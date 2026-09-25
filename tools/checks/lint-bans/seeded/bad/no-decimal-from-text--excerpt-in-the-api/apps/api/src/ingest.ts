// Seeded bad input (synthetic): an evidence excerpt read as a decimal, one reading only.
import { Decimal } from 'decimal.js';

export const valueOf = (evidence: { excerpt: string }) => new Decimal(evidence.excerpt);
