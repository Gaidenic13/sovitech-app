# Gates

One YAML file per gate, named `<id>.yaml`: the starting set of prompt 3 section 5.4. Each file holds:

- `id`, and `open` (every gate starts `false`);
- `waitsFor`: each proposal, dataset or owner decision the gate waits for, with its PRD D id, a `dataset` id for dataset items, and one `approvalRef` that starts empty;
- `closedBehaviour`: what the app does while the gate is closed;
- `source`.

Code reads a gate only through `readGate(source, id)` from `@sovitech/registry/gates`. The production source is built only from this folder; nothing reads an environment variable or a config file to open a gate. The functions that issue gate sources are private to `packages/registry/src/gates/source.ts`, and dependency-cruiser refuses an import of any package's `src/` files from outside that package except through its `package.json` exports (`package-internals-only-through-exports`). The override in `@sovitech/registry/test-utils` opens a gate in memory for `tests/proposed/` only: dependency-cruiser refuses any chain of imports that reaches it from outside `tests/proposed/`, and the gate source module refuses to issue or read an override unless the `tests/proposed/` runner's setup file (`packages/registry/src/test-utils/proposed-runner-setup.ts`, registered in `vitest.proposed.config.ts`) armed it for the test file that runs now. No environment variable arms it.

The loosening check (`pnpm checks -- --only loosening`) fails when a gate is open while no approver is named in `docs/guardrails.md` section 10, when an open gate has an item with no approval reference, and when any reference does not resolve. A reference is one of:

- `guardrails-changelog:<version>`: a change-log row in `docs/guardrails.md` whose "Approved by" cell is the approver's name, alone or followed by ", <YYYY-MM-DD>" (a cell that only mentions the approver, such as "Pending <name>'s review", does not count; a date after the day of the run records nothing; a placeholder such as "TBD", "n/a", "pending" or a dash names nobody), and whose Change cell names the proposal;
- `dataset-approval:<dataset>@<version>`: a dataset approval record citing such a row (how records reach the app is open, D-47, so none resolves yet);
- `owner-decision:<D-id>` or `owner-decision:build-readiness-<n>`: the owner's decision recorded with its date and the owner's own words in `docs/product/prd.md` section 15 or `docs/build-readiness.md` section 5.

References resolve only from git, never from the working tree: the check reads `docs/guardrails.md`, `docs/product/prd.md` and `docs/build-readiness.md` as they stand at `git merge-base refs/heads/main HEAD`, so an approval exists only once it is on `main`. Where no merge base exists (no local `main`, a shallow clone), nothing resolves and the check fails, naming the reason. The check also fails when the build branch or the working tree adds, edits or removes an approver-table row, edits an "Approved by" cell or a row that records an approval, adds a change-log row that names an approver, or records an owner decision that `main` does not hold.

Only people write approval references. See `docs/adr/0005-gates-mechanism.md`.
