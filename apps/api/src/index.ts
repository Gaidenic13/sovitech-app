import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { readPort } from './port';
import { buildServer } from './server';

// Prompt 3 section 5.4: the API refuses to start while any gate fails the
// loosening check (docs/adr/0005-gates-mechanism.md). assertGatesStartupSafe()
// throws before anything is built; buildServer() accepts only the source it
// returns, so the check cannot be left out.
const app = buildServer({ gates: assertGatesStartupSafe() });
await app.listen({ host: '127.0.0.1', port: readPort() });
