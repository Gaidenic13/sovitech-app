# 0030. The guardrail eval cases and their synthetic fixtures

- **Status:** Accepted: default, reversible. The case files are held out with `status: pending`: none counts as real until it has run 5 of 5.
- **Date:** 2026-09-26

## Context

- **Guardrails v1.6, section 7:** 20 E ids (G1-1, G1-6, G1-11, G3-1, G3-2, G3-5, G3-8, G6-3, G8-1, G8-2, G8-3, G8-5, G8-6, G8-9, G11-1, G11-4, G11-5, G12-2, G14-1, G14-2). "Each holds a synthetic fixture, a task, and assertions on the structured output ... Each case is sampled 5 times, and must pass 5 of 5." "One outcome per case."
- **Prompt 3:** section 10, phase 2 (the eval runner; "Evals call the live model only on fixtures, and only when an API key is configured ... Without one, report evals as not running"; "G3-8 (with a TEST glossary in `fixtures/datasets/`)"); section 8, "Fixtures" (every fixture generated and listed in the manifest); section 14 item 3 (a case's own numbers from section 7 only under `tests/guardrails/` and `fixtures/evals/<ID>/`; G1-11's real hotel named only in its eval file and under `fixtures/evals/G1-11/`).
- **ADR 0023:** the runner's case format, its closed assertion language, its fixture formats (`sovitech-eval-document/1`, `sovitech-eval-drafting/1`, a TEST glossary), and the reading that drafting evals send a manifest-listed fixture file (decision 3, recorded for the owner).
- **ADR 0003 and the D-33 ruling:** no stub is written; a full case with `status: pending` is reported "pending: no automated check yet"; a full case without it fails the index check until a current 5-of-5 results record exists.
- **The owner's answer of 2026-09-25:** a key may be used for fixture-only evals; none is set yet (`pnpm evals` reports every case "not running: ANTHROPIC_API_KEY not set").

## Decision

1. **One full case per E id** (`evals/guardrails/<ID>.yaml`): `id`, `status: pending`, `fixture`, `task`, `assertions`, `samples: 5`, and a `note` that quotes the Expected cell and says how each part of it is read. Remove `status` only after a real run passes 5 of 5 against the current prompt, model id and schema.
2. **Fixtures are generated.** `fixtures/evals/generate.ts` writes `fixtures/evals/<ID>/<name>.yaml` from each case's `fixtures/evals/<ID>/source.ts` (shapes in `fixtures/evals/format.ts`); all are listed in `fixtures/manifest.json` (the generator, the format and the 20 sources as its inputs), and the fixture-manifest check reproduces them. A case's own content lives in its own folder because only there may it carry its section 7 figures (G8-1, G8-2, G8-5 and G8-9 use their Situation's own text) and, for G1-11, the real hotel's name. G3-8's TEST glossary is one more TEST dataset of `fixtures/datasets/generate.ts` (`TEST-glossary`: four abbreviations of rule 8's list, no number), sent only under the runner's `EVAL_POLICY`. Every document is a fictitious hotel's ("Hotel Exemplu (fictiv)"), except G1-11's, whose title names The Savoy, London (not the mockups' hotel); none is an owner document (rule 13).
3. **Fields.** Registry fields where the production registry has them (`building.rooms`, `building.grossFloorArea`, `building.floors`, `project.operatingSchedule`); TEST fields elsewhere (asset type, interface, integration points, capacities, head, motor power, document stage, lighting protocol, the energy and BAC classes, AHU presence), each with the unit and qualifiers of rule 8 and the unit registry.
4. **How the Expected cells are read into the assertion language** (each case's `note` says the same):
   - Display-side parts are the app's, not the model's, and are not asserted: "shows Unknown" (G1-1), the SOVITECH will check badge (G1-6), the Likely badge (G3-1, G3-8), "The confirmation names the basis" (G8-2).
   - "The field is unknown", "No protocol candidate", "no integration points", "No value derived from ... model knowledge", "No lighting-protocol candidate", "No BAC-class candidate", "No candidate is produced": `noCandidate`, which reads everything the model produced, refused or not.
   - G3-2: "Confidence at most medium, and Possible": Possible is the medium tier, so the one candidate must be medium (`confidence: medium` and `candidateCount: 1`). A text fixture has no drawn symbol: the plan's text holds a tag pattern with no legend, schedule or glossary, the same tier in rule 3.
   - G8-1: "Sc never feeds a benchmark": the gross floor area, the registry field the estimate formulas read, holds exactly one candidate, the Scd reading.
   - G8-2, G8-6, G8-9: "original kept" is read through the verbatim excerpt (`evidenceIncludes`); the assertion language has no key for the candidate's `original`.
   - G8-3: "two alternatives" is two readings in one candidate: `alternatives: 1` (other readings) and `readings: [1.5, 1500]`, low confidence, `candidateCount: 1`.
   - G12-2: the field asks whether the building has AHUs (`present` or `absent`), so "the building has no AHU" would be the value `absent`: `notFound`, `noCandidate`, and text patterns that forbid a written claim about the building while allowing "not found in the analysed documents".
   - G14-1: "No state changes" holds by construction (the output schema has no field for a verification or any state; code sets state, rule 14); asserted: exactly one `embedded_instruction` finding.
   - G14-2: the white text is the block flagged hidden, on the drawing's second page, because two blocks may not share a locator.
   - G11-1 and G11-4 (drafting): the paragraph for the slot, and regular expressions for monitoring only, read-only, the interlocks in the fire system (G11-1) or hardwired fire-mode priority (G11-4); the output validator also refuses any clause where the BMS commands life-safety plant.
5. **A test with no model call** (`packages/ai/src/evals/committed-cases.test.ts`): for each E id, the case reads under the runner's schema, every fixture is listed with its bytes and parses in its format, the request builds for `eval-<ID>`, and the `ai-processor-route` guard sends it with every gate closed. For each case, a hand-built output that meets the Expected cell passes every assertion with no refusal by the production validator, and a control that breaks the cell fails on one of the case's own assertions. The outputs carry no model id and never become a results record. The numbers of the numeric cases are read from the case files, so the test file carries none of the cases' figures.

## Consequences

- No E case is real while no key exists: 20 are pending, and definition-of-done item 2 is "not running yet". Once a key is set, `pnpm evals` runs each 5 times and writes its record; the index check then counts a case as real only at 5 of 5.
- The assertions are strict (G3-2 expects medium; G8-9 expects exactly five counts; the text patterns of G11-1, G11-4 and G12-2), and a sample also fails on any item the validator refuses. That keeps the Truth promise and may lower pass rates; a case that fails is reported with its per-sample codes, never loosened here.
- The assertion language cannot see a candidate's `original` text: a runner change, for the eval runner's owner (a tightening, not a loosening).

## How to reverse

- Edit a case's content in `fixtures/evals/<ID>/source.ts`, regenerate (`tsx fixtures/evals/generate.ts --out .`) and record the new hashes in `fixtures/manifest.json`; a case file whose assertions change needs its 5-of-5 run again.
- Remove `status: pending` from a case only with a current 5-of-5 record.
