# evals/guardrails

One file per model-behaviour eval (E) of `docs/guardrails.md` section 7, at the top level of this folder. Each case is sampled 5 times and passes only at 5 of 5 (section 7). The eval runner arrives in phase 2; until then no eval runs.

- **File names.** The case id as section 7 writes it, then `.yaml` (not `.yml`): `G1-1.yaml`, `G8-3.yaml`.
- **Content.** A YAML mapping whose `id` key repeats the file's id, with the full case body of guardrails section 7: `fixture` (a path, or a list of paths, under `fixtures/evals/<ID>/` that exists), `task` (text or a mapping), `assertions` (a non-empty list of assertions on the structured output) and `samples: 5`. A file with less, an `id` line alone for example, fails the index check (`[eval]`) and its id stays "no automated check yet". The phase 2 eval runner may add keys; its own schema check then replaces the index check's.
- **Status.** Until the phase 2 eval runner exists, every eval counts as pending at most, never as real: the index check lists a full eval as "pending: no automated check yet", with or without `status: pending`. Once the runner exists, a full eval with no `status` key is a real case, and `status: pending` holds a written case out until its code exists (it still needs the full body, so only the runner or the code is missing). `status: stub`, or the `@guardrail-stub` marker: a placeholder, which never counts as a case. Any other status fails the index check.
- **Support data** goes in a folder whose name starts with `_`. Synthetic fixtures for evals live under `fixtures/evals/<ID>/`. Nothing here or there comes from an owner document (rule 13).
- **No stubs.** While D-33 is open, no placeholder file is written for a case that does not exist yet (`docs/adr/0003-index-check-convention.md`).

The index check (`tools/checks/index/`, run by `pnpm checks`) fails when an E id of section 7 has no file here, and when a file here is not named `<ID>.yaml`, names an id that is not in section 7, names a T id (code tests go in `tests/guardrails/`), does not parse, is not a mapping, has an `id` key that differs from its name, or lacks the full body.
