# Seeded run: unguarded

A synthetic Vitest root with no config, so the guardrails project's setup file, the stub guard (`tools/vitest/guardrail-stub-guard.ts`), does not run. Vitest alone passes its one case (`G1-1`). With the guardrail run guard as reporter, the run must fail with `[unguarded]`: a passing guardrail test that carries no record from the stub guard ran where a case that reaches an unbuilt domain stub would pass (phase 0 review, round 2). `tools/vitest/guardrail-run-guard.test.ts` and the index check's self-test run it both ways. Nothing here is a real guardrail case.
