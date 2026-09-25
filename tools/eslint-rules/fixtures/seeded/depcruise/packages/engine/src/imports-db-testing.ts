// Seeded bad import: a package reaches the store's TEST machinery (and the store itself).
import { createTestAccount } from '@sovitech/db/testing';

export const seeded = createTestAccount;
