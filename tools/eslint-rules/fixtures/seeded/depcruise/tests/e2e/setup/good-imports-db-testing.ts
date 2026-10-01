// Allowed: the e2e stack starts its TEST database through the store's TEST machinery.
import { startTestDatabase } from '@sovitech/db/testing';

export const seeded = startTestDatabase;
