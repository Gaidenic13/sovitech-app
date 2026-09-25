/**
 * A branded NotImplementedError from a domain stub that is still unbuilt, for the
 * harness's own unit tests (the pending wrapper, the property helper, the stub
 * guard). Only a domain stub can throw one (docs/adr/0004 decision 4), and the
 * stubs are built phase by phase, so the tests take whichever stub still throws:
 * each exported stub function is called with no argument, and the first error
 * the domain reads as a stub's (`notImplementedFeature`) is returned with its
 * feature. Undefined once no stub throws that way; a test that needs one then
 * says so and skips.
 */
import { derive, notImplementedFeature, verifyProposal, type DomainFeature } from '@sovitech/domain';

export interface StubProbe {
  feature: DomainFeature;
  /** Calls the stub again: it throws a fresh branded error each time. */
  call: () => never;
  /** The error the probe saw. */
  error: unknown;
}

const CANDIDATES: ReadonlyArray<() => unknown> = [
  () => (derive as unknown as () => unknown)(),
  () => (verifyProposal as unknown as () => unknown)(),
];

/** The first domain stub that still throws its branded error, or undefined. */
export function probeStub(): StubProbe | undefined {
  for (const candidate of CANDIDATES) {
    try {
      candidate();
    } catch (error) {
      const feature = notImplementedFeature(error);
      if (feature !== undefined) {
        return {
          feature,
          error,
          call: () => {
            candidate();
            throw new Error(`the ${feature} stub no longer throws`);
          },
        };
      }
    }
  }
  return undefined;
}
