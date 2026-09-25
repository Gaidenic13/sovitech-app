// Seeded bad import: app code reaches the store's TEST machinery.
import { startTestDatabase } from '@sovitech/db/testing';

export const seeded = startTestDatabase;
