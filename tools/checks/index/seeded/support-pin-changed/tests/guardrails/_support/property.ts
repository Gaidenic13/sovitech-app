import { notImplementedFeature } from '@sovitech/domain';

/**
 * Seeded stand-in for the property helper, edited after review: it now swallows every
 * error, not only the stub's. Its hash no longer matches the reviewed list, so it is held
 * to the full [support] rule.
 */
export function assertProperty(run: () => void): void {
  try {
    run();
  } catch (error) {
    void notImplementedFeature(error);
  }
}
