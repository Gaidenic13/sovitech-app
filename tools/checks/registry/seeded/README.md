# Seeded inputs of the registry check

Each folder is one input for `selftest.ts`, laid over the repository's production registry and gates:

- `registry.json` replaces top-level keys of the production registry;
- `gates/<id>.yaml` replaces that gate file;
- `gates-folder.txt`, when present, holds `replace` (the seed's `gates/` is the whole gate folder) or `missing` (the check runs as if `packages/registry/gates/` did not exist);
- `suite.ts` is the sensitivity suite (its default export).

Since the phase 1 review (round 3): `decision-not-owner` and `owner-choice-not-owner` (an owner's own choice confirmed by anyone but the owner, rule 3), `count-without-integer-shape` (a count with no whole-number shape, 2.6 and rule 8) and `unit-not-in-closed-registry` (a bundle unit that departs from the closed unit registry, 2.7 and ADR 0017).

`good/` is the control input and must pass. Every other folder must fail for the reason its `expected.txt` names, one line each. Everything here is synthetic and wrong on purpose where it says so; ESLint, TypeScript, Vitest and every scanning check ignore `tools/**/seeded/**`.
