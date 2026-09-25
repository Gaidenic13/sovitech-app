# Seeded run: not collected

A synthetic Vitest root whose config excludes one case file (`G1-2`). Vitest alone passes the run, because it never sees the excluded file. With the guardrail run guard as reporter, the run must fail with `[not collected]` for `tests/guardrails/G1-2.test.ts`. Nothing here is a real guardrail case. Its config also takes the `guardrails` project's setup files (the stub guard) from the repository's own config.
