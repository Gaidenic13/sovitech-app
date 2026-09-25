// Seeded bad import: store code that is not a test file reaches its TEST machinery.
import { createTestAccount } from './testing';

export const seeded = createTestAccount;
