/**
 * Fixture-manifest check: every fixture is listed with a matching hash and is
 * reproduced by running its generator into a temporary folder; no
 * document-type file sits outside fixtures/ except in the two other homes,
 * each for its own types; and no text file carries a document as base64 (see
 * manifest.ts).
 */
import { repoRoot } from '../lib';
import type { Check } from '../types';
import { checkFixtures } from './manifest';

const check: Check = () => checkFixtures({ root: repoRoot });

export default check;
