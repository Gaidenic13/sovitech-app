# Seeded inputs of the registry check

Each folder is one input for `selftest.ts`, laid over the repository's production registry and gates:

- `registry.json` replaces top-level keys of the production registry;
- `gates/<id>.yaml` replaces that gate file;
- `gates-folder.txt`, when present, holds `replace` (the seed's `gates/` is the whole gate folder) or `missing` (the check runs as if `packages/registry/gates/` did not exist);
- `suite.ts` is the sensitivity suite (its default export).

`good/` is the control input and must pass. Every other folder must fail for the reason its `expected.txt` names, one line each. Everything here is synthetic and wrong on purpose where it says so; ESLint, TypeScript, Vitest and every scanning check ignore `tools/**/seeded/**`.
