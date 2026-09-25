// @pending-until: phase 2 verify-proposal
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G2-6 · seeded pending case whose body fails to import a module', async () => {
  const missing = './does-not-exist-seeded-module.js';
  await import(/* @vite-ignore */ missing);
});
