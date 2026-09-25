# Seeded run: held out only

A synthetic Vitest root in which Vitest alone passes: one real case (`G1-1`) and one case held out by `{ skip: true }` (`G1-3`), which Vitest counts as skipped and exits 0 on. With the guardrail run guard as reporter, the run must exit 1. `tools/vitest/guardrail-run-guard.test.ts` runs it both ways. Nothing here is a real guardrail case. Its `vitest.config.ts` takes the `guardrails` project's setup files (the stub guard) from the repository's own config, so the control case carries the stub guard's record as the repository's cases do.
