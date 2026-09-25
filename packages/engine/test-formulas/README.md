# packages/engine/test-formulas

TEST bodies for the formula signatures the production registry declares (`packages/registry/src/production/formulas.ts`), and for its proposal template slot. Prompt 3 section 5.4 and phase 5: TEST formulas are excluded from the production registry and loadable only inside the test runner.

- **Who loads them:** the sensitivity suite (`tools/checks/registry/sensitivity-suite.ts`, run by the registry check and by case G6-1) and, from phase 5, engine cases whose method no source defines yet. Nothing in `apps/` or `packages/*/src` imports this folder.
- **What they read:** only the inputs their signature declares, and only TEST datasets (`fixtures/datasets/`, from `fixtures/datasets/generate.ts`).
- **What they are not:** SOVITECH's methods. No production body exists for any of these signatures; the app shows "Not available yet", naming the missing dataset or method.
- **How they compute:** exactly, on whole numbers (`lib.ts`); a TEST table with no entry for an answer gives a `notAvailable` output naming it, never a zero or a stand-in value (guardrails rule 1).
