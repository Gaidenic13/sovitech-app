# Seeded inputs of the loosening check

Each folder is one input for `selftest.ts`, laid over the repository's registry, gates, baseline, documents and exception lists (`../core.ts`, `seededInputs`):

- `registry.json` replaces top-level keys of the production registry; when it replaces `formulas` or `datasets`, the baseline's come from `snapshot.json` or, without them there, from the seed's own registry (they are not the seed's subject);
- `registry-edits.json` edits the production registry and the registry's lists in place (phase 1 review, round 3): `fields.<key>` merges properties into that production field (`null` removes one); `formulas.add`, `formulas.change.<formula:id@version>`, `formulas.remove`; `datasets.add`; `units.add`, `units.change.<code>`, `units.remove` on the closed unit registry; `floorNotationLetters.add` (`{ letter: levelType }`) and `.remove`. The seed is then compared with the repository's own baseline, as the adversarial probe's edits were;
- `gates/<id>.yaml` replaces that gate file;
- `snapshot.json` replaces top-level keys of `unapproved baseline v0`, and merges `fields`, `gates`, `formulas`, `units` and `floorNotationLetters` by key;
- `approved/*.json` are approved snapshots;
- `guardrails.md`, `prd.md`, `build-readiness.md` replace those documents for approval references only, read as if they were main's (the policy anchors always read the repository's `docs/guardrails.md`);
- `git/` builds a temporary git repository and reads the approvals and the tripwire from it, as the check reads the repository's (phase 0 review, round 2): `git/main/` is committed on main over minimal synthetic documents, `git/branch/` on a build branch cut from main, `git/main-after/` on main after the branch point (not merged), and `git/worktree/` is left uncommitted. The repository is created under the system temporary folder and removed afterwards;
- `exception-lists.json` changes the exception lists as read today (`lists.<id>.add`, `remove`, `removeFirst`, `change`; `dropFromCurrent`; `baselineMissing`; `approved`, an approved exception-list snapshot built from the baseline);
- `guardrails-working-tree-edit.json` (`edits`: `{ find, replace }`) edits `docs/guardrails.md` as the working tree holds it, for the 2.8 texts of ADR 0011; main's merge base is read from git as it is (phase 1);
- `owner-review-add.txt` (`<list id> <key>` per line) lists entries in the build log's "For the owner's review" section, and `build-log-edit.json` (`edits`) edits the build log, for that list (phase 1);
- `probe.mts` makes the folder a runtime probe of the gate source: `selftest.ts` runs it with tsx in a plain Node process, with `VITEST=true`, and every attempt it reports must be refused.

`boundary-imports/` is not an input of this check. It holds seeded imports for the dependency-cruiser gate rules (`package-internals-only-through-exports`, `gate-test-utils-only-from-proposed`, `proposed-tests-only-from-proposed`, `no-tests-from-apps-or-packages`), in the format of `tools/eslint-rules/fixtures/seeded/depcruise/` (`expectations.json`, with a `before` list of earlier configurations and the probes each let through); `../boundary-seeds.test.ts`, the lint-bans self-test and `tools/eslint-rules/depcruise.test.ts` prove them.

`good/`, `good-git-approval-on-main/` and `good-2-8-badge-allowance/` (allowances that are word for word texts of 2.8, of their kinds: 2.8 itself, ADR 0011) are the control inputs and must pass. Every other folder must fail for the reason its `expected.txt` names, one line each. The approver named in a seeded `guardrails.md` ("Seed Approver") is fictitious and exists only here; a seed is never an approval. Everything here is synthetic; ESLint, TypeScript, Vitest and every scanning check ignore `tools/**/seeded/**`.
