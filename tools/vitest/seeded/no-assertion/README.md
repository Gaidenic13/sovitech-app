# Seeded run: a guardrail test with no assertion

A synthetic Vitest root. `G1-1` is a control that asserts; `G1-3` runs a body that asserts nothing, so it passes whatever the code under test does. Its `vitest.config.ts` reads the `expect` settings of the `guardrails` project from the repository's own `vitest.config.ts`, so the seed proves that config and not a copy of it.

- With the repository's settings (`expect.requireAssertions`, added after the phase 0 review, finding 9), Vitest fails `G1-3` and the run exits 1.
- With `SOVITECH_SEED_WITHOUT_REQUIRE_ASSERTIONS=1`, the config uses no `expect` settings, as the repository did before the fix, and the run exits 0: the old config let the case through.

The index check's self-test (`tools/checks/index/selftest.ts`) runs it both ways. Nothing here is a real guardrail case, and the values are TEST values.
