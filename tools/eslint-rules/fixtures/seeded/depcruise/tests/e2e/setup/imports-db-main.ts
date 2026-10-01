// Seeded input: the e2e stack imports the store only through its TEST machinery (V-13).
import { withRequest } from '@sovitech/db';

export const seeded = withRequest;
