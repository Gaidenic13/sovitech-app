# 0021. The AI boundary's client: the Anthropic TypeScript SDK, the model id and the key

- **Status:** Accepted: default, reversible (the SDK and its configuration). The model id is the owner's decision of 2026-09-25.
- **Date:** 2026-09-26; amended 2026-09-30 (the phase 2 review: decision 7 and the boundary's selectors)

## Context

- **Prompt 3 section 10, phase 2, "The AI boundary":** load the `claude-api` skill first; take the model id from the live docs or `docs/build-readiness.md` 3 item 6 and ask the user to confirm it; store the id with every candidate; structured outputs; document text in delimited data blocks; no Citations (they cannot be combined with structured outputs), no Files API, no fallbacks. Build-readiness 3 "Now" item 6: the Anthropic TypeScript SDK, synthetic data only until the processor route is decided. PRD section 13, row "The AI boundary": Proposed, D id **D-09**. The eval runner (item 7): in-repo TypeScript, 5 samples, 5 of 5, reusing the production validator (D-33).
- **Owner's answers, 2026-09-25** (build log): the model id, "claude-opus-5-5 (Recommended)"; the API key may be used for fixture-only evals and AI recordings ("Yes, I'll set a key"); the key is not set yet, and the owner may put it in a git-ignored `.env` at the repository root.
- **Rule 13, "Processing":** documents are not sent anywhere beyond the processing services the app needs. The `ai-processor-route` gate lets only fixture content through (prompt 3 5.4).
- The `claude-api` skill was loaded before this choice (2026-09-26). It lists `claude-opus-5-5` as launching, "use only when the user names it"; the owner named it.

## Decision

1. **Packages, in `packages/ai` only** (pinned): **`@anthropic-ai/sdk` 0.128.0** (MIT; published 2026-09-22), with its dependencies `json-schema-to-ts` 3.1.1, `ts-algebra` 2.0.0, `@babel/runtime` 7.29.7, `standardwebhooks` 1.1.1, `@stablelib/base64` 1.0.1 and `fast-sha256` 1.3.0 (Unlicense); **`zod` 4.6.5** (the SDK's peer, and the output schemas; `z.toJSONSchema` gives the schema hash the eval results record); **`yaml` 2.9.1** (reading `evals/guardrails/<ID>.yaml`). zod and yaml were already in the root's development dependencies at the same versions; `packages/ai` now declares them itself.
2. **Structured outputs** through `client.messages.parse` with `output_config.format` built by `zodOutputFormat` (`@anthropic-ai/sdk/helpers/zod`). The SDK's parse is not the validator: the production output validator re-checks every output before anything is stored (rules 1, 2, 3, 11, 14), as prompt 3 section 7 requires.
3. **The model:** `claude-opus-5-5`, one constant in `packages/ai`, stored with every AI candidate and in every eval results record. From the skill, for this model: thinking cannot be disabled and effort defaults to `medium`, so the boundary sets effort explicitly; forced `tool_choice` returns an error, which structured outputs avoid; no assistant prefill. A `refusal` stop reason yields no output: the extraction is recorded as failed for that document with a guardrail event, never as a value or a "not found".
4. **No fallbacks.** Build-readiness 3 item 6 rules them out, so the server-side `fallbacks` parameter the skill offers is not sent: a candidate always names the one model that produced it.
5. **The key, and only the key.**
   - Read from `process.env.ANTHROPIC_API_KEY`, else from `.env` at the repository root (git-ignored), parsed with `node:util`'s `parseEnv` and reading that one variable (no `dotenv` dependency, and the database passwords in the same file are not loaded into the environment).
   - The client is built with that key only: `apiKey` set, `authToken: null`, and no `profile`, so the SDK never falls back to `ANTHROPIC_AUTH_TOKEN` or a CLI login profile the machine happens to hold. `baseURL` is set to `https://api.anthropic.com`, so `ANTHROPIC_BASE_URL` cannot send fixture content elsewhere.
   - With no key, no client is built: evals report "not running" with the reason, and no AI recording is written. A recording comes only from a real run on a fixture, stored with the model id and date the API returned (prompt 3 phase 2).
   - The key is never logged, written, put in a URL or included in an error.
   - `.env.example` names the variable with an empty value.
6. **Before any call,** the `ai-processor-route` gate's runtime guard refuses content that is not fixture content (a document whose hash is not in `fixtures/manifest.json`, or drafting input outside the demo project), and logs the refusal.
7. **The SDK logs nothing** (amended 2026-09-30, the phase 2 review: at `ANTHROPIC_LOG=debug` the SDK printed request bodies, which hold document text; rule 13, "Logs and error reports never contain document text"). The client is built from `anthropicClientOptions` with `logLevel: 'off'` and a logger that discards every line, so no environment variable turns the SDK's logging on. `packages/ai/src/transport.test.ts` runs a request with `ANTHROPIC_LOG=debug` against a refusing fetch and checks that nothing reaches `console.*`, stdout or stderr, beside a control client with the SDK's own settings that does log.

## Consequences

- Without a key today, the evals do not run and the demo has no AI-proposed values; each phase report says so.
- An SDK upgrade is a model-boundary change: it is pinned, and the guardrail evals must pass 5 of 5 after it (definition of done item 2) once a key exists.
- Only `packages/ai` should import the SDK. **Enforced since phase 2** (prompt 3 section 6, "Boundaries"): the ESLint block `sovitech/anthropic-sdk-boundary` in `eslint.config.js` refuses any import of `@anthropic-ai/*` outside `packages/ai/src/transport.ts` and its test (`tools/eslint-rules/anthropic-sdk-boundary.test.ts` proves it), and `packages/ai/src/transport.test.ts` pins the same over the sources. Since the phase 2 review (2026-09-30) a `no-restricted-syntax` block also refuses a dynamic `import('@anthropic-ai/...')` with a string or template literal, any call whose first argument starts with `@anthropic-ai/` (`require`, `module.require`, `createRequire(...)(...)`) and TypeScript's `import x = require(...)`, outside the transport; the source scan reads `from`, `import(`, `require(` and bare `import` forms in `.ts` and `.js` files. It is not a dependency-cruiser rule: `.dependency-cruiser.cjs` excludes third-party modules from the boundaries (`options.exclude.path`), so no rule there sees the import, and narrowing that exclusion changes an allow-list entry, which the loosening check refuses without the approver (ADR 0010).

## How to reverse

- **Another SDK version:** change the pin in `packages/ai/package.json`, run `pnpm install`, re-run the evals 5 of 5.
- **Another model id:** only with the owner's decision, recorded in the build log; then the evals.
- **Raw HTTP instead of the SDK:** not advised (the skill's rule: the official SDK unless there is none); the boundary's interface stays the same.
