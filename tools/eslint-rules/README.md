# tools/eslint-rules: the lint bans and the package boundaries

The SOVITECH ESLint plugin (`index.js`) and the dependency-cruiser boundaries (`/.dependency-cruiser.cjs`). They enforce the code-level items of prompt 3 section 7 and the phase 0 build list (section 10): no `?? 0`, `|| 0` or `Number()` on engineering values, no total that drops unknown items silently and no total outside `packages/engine` (guardrails rule 1, "Unknown propagates"), colour literals only in `packages/ui/src/tokens.css`, no shadows, the package boundaries of section 6, and no module path that dependency-cruiser cannot read.

Each rule points to its rule or section; this file does not restate the guardrails.

## Where they run

| Command | What runs |
|---|---|
| `pnpm lint:eslint` | the shared `eslint.config.js`, which spreads `configs.recommended` from `index.js` last |
| `pnpm lint:deps` | `tools/checks/scan-roots/lint-deps.ts`: dependency-cruiser with `.dependency-cruiser.cjs` on the "lint:deps" roots of the shared scan-roots list (`tools/checks/scan-roots/roots.json`; today `apps packages tools tests evals fixtures`). Until the phase 0 review round 2 (adversarial finding 13) the roots were written in the script |
| `pnpm checks` (`lint-bans` row) | the SOVITECH rules only, with inline configuration switched off, a scan of HTML pages for colour literals and shadows, a scan for files no ban reads (`lint-bans/unread-extension`), and the boundaries on the same "lint:deps" roots (`tools/checks/lint-bans/`) |
| `pnpm checks` (`scan-roots` row) | the shared list of scan roots: every folder at the top of the repository and under `packages/<pkg>/` and `services/<service>/` is scanned or excluded (`tools/checks/scan-roots/README.md`) |
| `pnpm check:selftest` (`lint-bans` row) | every seeded bad input under `tools/checks/lint-bans/seeded/bad/`, `fixtures/seeded/depcruise/` and `tools/checks/loosening/seeded/boundary-imports/` (the gate-boundary seeds) must fail, and the check fails an empty scope: an `apps/` or `packages/` folder with no file read, or a boundary run with no module (`lint-bans/scope`; phase 0 review, finding 17) |
| `pnpm test` | the RuleTester tests (`*.test.ts` here; `no-zero-fallback.test.ts` also runs a typed RuleTester on `fixtures/typed/`), the scope and allowlist test (`config.test.ts`), the boundary fixture test (`depcruise.test.ts`) and the check's own test |

An `eslint-disable` comment can silence a rule in `pnpm lint:eslint`, but not in the `lint-bans` check, which ignores inline configuration. The only exemptions are the files in `allowlist.js`, listed below.

## Scope

- **Roots:** `apps/` and `packages/`, the "lint-bans" roots of the shared scan-roots list (`tools/checks/scan-roots/roots.json`), which the `lint-bans` check reads.
- **JS and TS:** every `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts` and `.cts` file under `apps/` and `packages/` (`SCRIPT_EXTENSIONS` in `index.js`), test files included. `.mts` and `.cts` were added after the phase 0 review round 2 (adversarial finding 12): TypeScript and Vite accept them, and they had no ESLint configuration at all; `eslint.config.js` names them in its file globs too. Engineering values cannot be told apart from other numbers at lint time, so the number bans cover all of it, not only engineering code.
- **Files no ban reads:** the `lint-bans` check fails on any file under `apps/` or `packages/` with a script, component, style or markup extension that no ban reads (`.vue`, `.svelte`, `.astro`, `.mdx`, `.coffee`, `.scss`, `.less`, `.styl` and the others in `EXTENSIONS_A_BAN_MUST_READ`, `tools/checks/lint-bans/lint-bans.ts`), with the id `lint-bans/unread-extension`. Write such a file in a language the bans read, or extend the bans first.
- **CSS:** every `.css` file under `apps/` and `packages/`, parsed in tolerant mode because Tailwind's at-rules are not standard CSS. The rules also read the text the parser leaves raw (`lib/css.js`).
- **HTML:** ESLint does not read `.html`, so the `lint-bans` check scans every `.html`, `.htm` and `.xhtml` file under `apps/` and `packages/` (today `apps/web/index.html`) for colour literals, colour classes and shadows, with the same matchers (`lib/patterns.js`). Its problems carry the ids `lint-bans/html-colour-literals` and `lint-bans/html-shadows`.
- **Not covered:** `tools/`, `tests/`, `evals/`, `fixtures/` (test code and seeded inputs, which hold banned patterns on purpose), `services/` (Python: its own bans are `services/extractor/tests/test_bans.py`, run by `pnpm test:py`), `company/` (never an input), and `.svg` files: the brand logos are copied verbatim with their SHA-256 (prompt 3 section 6, "Brand assets"), so their colours are the brand's own. An SVG written for the app belongs inline in a component, where the colour rules read it.

## Rules

### no-zero-fallback

Bans a zero standing in for a value that may be missing (guardrails rule 1, "Unknown propagates"):
- `x ?? 0`, `x || 0`, `x ??= 0`, `x ||= 0`;
- a default of 0 in a parameter or a destructuring pattern (`({ area = 0 }) =>`), which is `?? 0` in another spelling;
- conditionals that fall back to 0 on the value they test (`x != null ? x : 0`, `x ? x : 0`);
- conditionals whose other branch reads the value, or a property of the value, that the test checks for being present (`x === undefined ? 0 : x.area`, `selected ? selected.count : 0`, `isDefined(x) ? x.area : 0`); optional chaining reads as plain access;
- zero in any spelling: `0`, `0.0`, `-0`, `0n`, `'0'`, `` `0` ``, `Decimal(0)`, `new Decimal('0')`;
- a name bound to a zero (added 2026-09-25, phase 0 review finding 22): a `const` initialised to a zero, a `let` or `var` whose only write is its initialiser, a chain of such names (`const NONE = ZERO`), and a property of a const object literal whose value is a zero (`DEFAULTS.area` with `const DEFAULTS = { area: 0 }`, also through `as const` and `Object.freeze`);
- with type information (`pnpm lint:eslint`, which lints with the TypeScript project service), any name or property whose type is the literal type `0`, `0n` or `'0'`, which catches a zero constant imported from another module. The `lint-bans` check lints without type information, so there only constants declared in the same file resolve; `pnpm check` runs both.

A literal 0 that is not a fallback (`let i = 0`, `hasHeader ? 1 : 0`, a reduce seed, `count === ZERO`) passes, and so does a conditional that tests a flag rather than the value it reads (`props.visible ? props.count : 0`).

### no-filtered-sum

Added 2026-09-25 (phase 0 review, finding 22). Bans totals that drop the missing values first and add up the rest, so that unknown items vanish from the figure (guardrails rule 1, "Unknown propagates": no numeric stand-in; a total that leaves unknown items out says so). Totals go through the engine helper that applies a formula's `unknownPolicy` (`packages/engine`, phase 5). Any other file needs a reviewed allowlist entry.

- **Dropping missing values:** a `filter` whose callback tests the item, or a property of it, for being present: `!== undefined`, `!= null`, `typeof ... === 'number'` (or `!== 'undefined'`), `instanceof`, `!!`, `!(x === undefined)`, `!isNil(x)`, a presence-check function (`Boolean`, `isDefined`, `Number.isFinite` and the others in `lib/presence.js`), or the truthiness of the item itself (`filter((x) => x)`); and a `flatMap` that returns `[]` for a missing item (`x === undefined ? [] : [x]`, `x ?? []`).
- **Reaching the total:** directly, through other array steps (`map`, `filter`, `flatMap`, `slice`, `sort` and the like, `Array.from`, a spread into an array literal), or through a name that holds the filtered array and never changes.
- **The total:** a `reduce` or `reduceRight` whose callback does arithmetic (`+`, `-`, `*`, `/`, `%`, `**`, their assignments, or a decimal method such as `plus`), or whose callback is not written inline; and a call named `sum`, `total`, `mean`, `average`, `avg`, `max`, `min` (or their `By` and `Of` forms) that takes the filtered array, spread or not (`Math.max(...)`, `Decimal.sum(...)`).
- **Reducers and loops that branch on a missing value** (added after the phase 0 review round 2: adversarial finding 7, and finding 4 of the second verification, whose probe was `for (const v of xs) if (v !== undefined) s += v;`):
  - a `reduce` or `reduceRight` whose inline callback does arithmetic and tests for a missing value (`xs.reduce((s, v) => (v === undefined ? s : s + v), start)`);
  - a loop (`for`, `for ... of`, `for ... in`, `while`, `do ... while`) or a per-item callback (`forEach`, `map`, `flatMap`, `filter`, `some`, `every`, `find` and the like, `Array.from`) that folds a value into a running total declared outside it (`s += v`, `s -= v`, `s = s + v`, `s = s.plus(v)`, `m = Math.max(m, v)`, `totals[key] += v`), when its body tests for a missing value anywhere;
  - the same loop or callback over an array that dropped its missing values (`for (const v of xs.filter(isDefined))`, `known.forEach(...)`, `known[i]` in an index loop).
  - A test for a missing value is a comparison with `undefined` or `null`, `typeof`, `x !== x` or `NaN`, `isNaN`, a presence or absence check (`lib/presence.js`, `isNil`), `instanceof`, `in`, `??` or `??=`, or the truthiness of the item or of the value added (`if (!v) continue;`, `if (row.area) s += row.area;`). The loop's own test (`while (node !== undefined)`) ends the loop and is not read.
- **Passes:** a filter on a flag (`items.filter((item) => item.inScope)`, `rows.filter((row) => row.visible)`, `if (row.visible) s += row.width`), a filter that keeps the missing items, a count of present items (`.length`, `n += 1`, `n++`, `n += list.length`), text built in a loop (a string or template step, or a running value that starts as text), a running value declared inside the loop body, and a reduce that does no arithmetic (building a map).
- **Not covered:** an accumulation in a plain function body outside any loop or per-item callback (`if (a !== undefined) s += a; if (b !== undefined) s += b;`), recursion, a per-item function passed by name (`xs.forEach(addTo)`), and helpers the rule cannot see into (`if (keep(v)) s += v`). Outside `packages/engine`, `no-total-outside-engine` bans those totals whatever they test. The engine helper of phase 5 is the place for totals; it gets an allowlist entry for this rule only after review. The behaviour itself is what guardrail cases G1-2 (a total with unknown items) and G1-5 (a chart with an unknown item) test; both have no automated check yet.

### no-total-outside-engine

Added after the phase 0 review round 2 (adversarial finding 7). Totals are made in `packages/engine`, by the helper that applies a formula's `unknownPolicy` (prompt 3 section 6; guardrails rule 1, "Unknown propagates" and "Material exclusions"; 2.1: `calculated` candidates come from the calculation engine only). The rule applies to `apps/` and to every package but `packages/engine` (`ENGINE` in `index.js`), and bans a total made anywhere else, whether or not it tests for a missing value:
- a `reduce` or `reduceRight` whose inline callback adds or subtracts a value onto its accumulator (`+`, `-`, `+=`, `-=`, or `plus`, `add`, `minus`, `sub`, `sum`), or whose callback is not written inline and whose start is not text, an array, an object or a new collection;
- a loop or per-item callback (as for `no-filtered-sum`) that adds values into a running total declared outside it;
- `Decimal.sum(...)`, `Big.sum(...)`, `BigNumber.sum(...)` and `Math.sumPrecise(...)`.

Passes: counting (`n += 1`, `n++`, `n += list.length`), text built with `+`, maxima and minima (`Math.max`, the conflict test's spread in rule 4), arithmetic that folds no running value (`row.a * row.b`, `index + 1`), and loop counters in a `for` header. A call to a function named `sum` or `total` is not flagged here, so the engine's own helper can be called by name from the API.

The rule cannot tell an engineering total from other arithmetic: a running layout offset in a chart (`offset += segment.width`) is banned too. The chart's series and positions come from display objects (prompt 3 section 6), so this is the stricter reading; a reviewed allowlist entry is the way out for a file that needs one.

### no-computed-import

Added after the phase 0 review round 2 (finding 0 of the second verification: `await import(dir + 'source')` in `apps/api` reached the registry's gate issuer, and dependency-cruiser recorded no dependency). The boundaries are only as good as the edges dependency-cruiser can see, so every module path is written in the code (prompt 3 sections 5.4 and 6). Banned in `apps/` and `packages/`:
- `import(x)` where `x` is not a string or a template without `${}`;
- `require(x)`, `module.require(x)` or `require.main.require(x)` where `x` is not a string, and `require` used as a value (`const load = require`);
- `createRequire(...)`: dependency-cruiser does not see the calls of the loader it returns, even with a literal path (checked on 2026-09-25);
- `import.meta.glob(...)` and `import.meta.globEager(...)` (Vite), which dependency-cruiser does not expand;
- `eval(...)`, `Function(...)`, `new Function(...)` and their `globalThis.` forms, which can load a module from text.

A literal `import('./a')` or `` import(`./a`) `` passes: dependency-cruiser reads it and applies every boundary (checked on 2026-09-25 with the second verification's probes). `require.resolve()` passes, and so do local functions named `require` or `eval`. Not covered: `new Worker(new URL(path, import.meta.url))`, whose edge dependency-cruiser does not follow either; phase 4 (the viewer) adds the ban with the first worker.

### no-number-coercion

Bans turning a value into a JavaScript number by hand: `Number(x)`, `new Number(x)`, `parseFloat`, `parseInt`, `Number.parseFloat`, `Number.parseInt`, the same through `globalThis` or `window`, `Number` or `parseFloat` passed as a function (`list.map(Number)`), unary `+x`, and the bitwise idioms `x | 0`, `~~x`, `x >>> 0`, which also turn a missing value into 0. Numbers are read from text by the one rule 8 parser in `packages/registry` and rounded by the formatting module (guardrails rules 8 and 9; prompt 3 section 6). `Number.isFinite`, `Number.isInteger`, `Number.MAX_SAFE_INTEGER` and the like pass. A local declaration named `Number` or `parseInt` (an import from the parser, say) passes.

### no-colour-literals and css-no-colour-literals

Colours come only from `packages/ui/src/tokens.css` (prompt 3 section 6, "Brand assets"; section 14 item 3). Reported:
- hex colours and colour functions (`rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`) in any string, template or CSS value;
- Tailwind classes that name a colour the theme does not define: palette classes (`bg-red-500`, `text-white`), arbitrary values (`bg-[red]`, `[color:red]`), in any string and in `@apply`;
- named CSS colours in style values: style objects, colour properties, SVG colour attributes (`fill`, `stroke`, `stopColor`, ...), `style.setProperty()`, assignments such as `el.style.color = ...` and `ctx.fillStyle = ...`, and CSS colour properties;
- three.js colours: `new Color(...)` and `setHex()`, `setStyle()`, `setRGB()`, `setHSL()`, `color.set()` with literal arguments, and numeric colours (`color: 0xff0000`). The viewer reads its colours from the CSS custom properties at runtime (prompt 3 section 6).

Allowed: `var(--sov-...)`, the theme's classes (the `--color-<name>` entries of `@theme` in `packages/ui/src/tokens.css` and `apps/web/src/styles.css`, read by `lib/theme.js`), `transparent`, `currentColor`, `inherit`, `none`, CSS system colours (`Canvas`, `Highlight`, ...) for forced-colours mode, fragment links (`href="#main"`, `url(#gradient)`), and colour words in prose, which is not a style value.

### no-shadows and css-no-shadows

The brand has no shadows, and focus rings use `outline`, because Tailwind's `ring-*` is built on box-shadow (prompt 3 sections 5.1 and 6). Reported: `box-shadow` and `text-shadow` (except `none`), `drop-shadow()` filters, the SVG `feDropShadow` filter, custom properties that define a shadow, and the Tailwind utilities `shadow*`, `inset-shadow*`, `drop-shadow*`, `text-shadow*`, `ring*`, `inset-ring*` and `ring-offset*`. In a class list (a `className` value, a `cn()` or `clsx()` call, a variable named like `buttonClass`) every such utility counts; in other strings only tokens shaped like a Tailwind utility count, so prose such as "ring-fenced" passes. `css-no-shadows` applies to the tokens file too.

## The allowlist

`allowlist.js` holds the only files where a ban does not apply. `config.test.ts` fails when an entry below is missing from this file.

| Rule | Files | Why |
|---|---|---|
| no-number-coercion | `packages/registry/src/number-parser/**` | The one Romanian and English number parser of guardrails rule 8 ("Parsing"), which prompt 3 section 6 places in `packages/registry`. Phase 1 writes it at this path. |
| no-number-coercion | `packages/view-model/src/formatting/**` | The formatting module of prompt 3 section 6 (view-model server side), which owns rounding at display (guardrails rule 9, "Rounding"). Phase 3 writes it at this path. |
| no-number-coercion | `apps/api/src/port.ts` | One function, `readPort`: the API listen port from `SOVITECH_API_PORT`. A port is configuration, not a field of the value model. Until 2026-09-25 the entry covered the whole API entry, `apps/api/src/index.ts` (phase 0 review, finding 22); `config.test.ts` now fails if `port.ts` holds anything but that one function. |
| css-no-colour-literals | `packages/ui/src/tokens.css` | The one tokens file (prompt 3 section 6, "Brand assets"; section 14 item 3). |

`no-zero-fallback`, `no-filtered-sum`, `no-total-outside-engine`, `no-computed-import`, `no-colour-literals` and the two shadow rules have no allowlisted file: no non-engineering file in `apps/` or `packages/` needs a zero fallback, a total that drops unknowns, a total outside the engine, a computed module path, a colour literal or a shadow. The engine helper that applies `unknownPolicy` (phase 5) gets a `no-filtered-sum` entry only if it needs one, after review. `packages/engine` itself is outside `no-total-outside-engine` by the rule's scope (`ENGINE` in `index.js`), not by an allowlist entry.

### Changing the allowlist

An entry lets more code through. Add one only for a file that carries no engineering value the ban protects (or, for the parser, the formatting module and the tokens file, the one place the banned thing belongs), with its reason in `allowlist.js` and a row here, and list it in the build log for review. Prefer changing the code: pass a value explicitly instead of defaulting it to 0, read a colour from a custom property instead of writing it.

## Package boundaries (`.dependency-cruiser.cjs`)

| Rule | What it forbids | Source |
|---|---|---|
| `no-company-imports` | any import that resolves into `company/` | prompt 3 section 6; build-readiness decision 12 |
| `web-imports-only-browser-entries` | `apps/web` importing any workspace module other than its own files, `@sovitech/view-model/browser`, `@sovitech/ui` and `@sovitech/viewer` | prompt 3 section 6 |
| `db-only-from-api` | `@sovitech/db` imported from outside `apps/api`, `packages/db` itself and the guardrail case folders (reading 2 below) | prompt 3 section 6 |
| `view-model-server-only-from-api` | the view-model server side (everything in `packages/view-model/src` except `browser.ts` and `browser/`) imported from outside `apps/api`, the server side itself and the guardrail case folders (reading 2 below) | prompt 3 section 6 |
| `ui-viewer-no-domain-engine-registry` | `packages/ui` or `packages/viewer` importing anything from domain, engine or registry | prompt 3 section 6; guardrails rule 2, "Enforced by" |
| `gate-test-utils-only-from-proposed` | the registry `test-utils` entry, the only place a gate can be opened, reached from outside `tests/proposed/` directly or through any chain of imports (`reachable: true` since the phase 0 review round 2, which reached it through `apps/api` -> `tests/proposed/<helper>` -> `test-utils`) | prompt 3 section 5.4 |
| `proposed-tests-only-from-proposed` | any file outside `tests/proposed/` importing a file under `tests/proposed/`, so neither an indexed guardrail case nor app code can borrow a gate the override opened. Added in the phase 0 review round 2 | prompt 3 section 5.4 (gated tests are not indexed and do not block) |
| `no-tests-from-apps-or-packages` | `apps/` or `packages/` importing anything under `tests/`. Added in the phase 0 review round 2 | prompt 3 section 6 |
| `package-internals-only-through-exports` | a file under `packages/<pkg>/src/` imported from outside that package other than through an entry in its `package.json` exports (read when the config loads), type-only imports included. Added after the phase 0 review (findings 0 and 11), which opened a gate by a relative import of `packages/registry/src/gates/source.ts` | prompt 3 section 5.4 |
| `packages-do-not-import-apps` | a package importing an app | prompt 3 section 6, "Architecture" |
| `browser-code-reaches-no-server-code` | any chain of imports from `apps/web`, `ui`, `viewer` or the view-model browser side that reaches domain, engine, registry, db, ai, the view-model server side or `apps/api` | prompt 3 section 6: no candidate, event or bare engineering number reaches the browser |
| `not-to-unresolvable` | an import that does not resolve, which could hide a boundary crossing | this folder |

Each path pattern matches the three forms an import can resolve to: the real path under `packages/`, a path through `node_modules/@sovitech/`, and the bare package name. Seeded inputs (`tools/**/seeded/`, `tools/eslint-rules/fixtures/`) are excluded from the real run. `fixtures/seeded/depcruise/` holds seeded imports for the boundaries and `expectations.json` names the rules each file must violate; `depcruise-harness.ts` copies it to a temporary folder with package stubs and `node_modules/@sovitech` links shaped like the real workspace, and `depcruise.test.ts` checks that every rule fires where expected and nowhere else. The gate-boundary seeds for `package-internals-only-through-exports` live in `tools/checks/loosening/seeded/boundary-imports/` (same format; `tools/checks/loosening/boundary-seeds.test.ts` also shows that the configuration without the rule let each deep import through). `depcruise.test.ts` fails a rule that neither set proves, and the `lint-bans` self-test runs both.

## Readings recorded for review

These are choices this folder makes where the sources leave room. Each is reversible in this folder.

1. **Broader than the letter, stricter in effect.**
   - The number and zero bans cover all of `apps/` and `packages/`, not only `packages/*/src`, so `packages/engine/test-formulas/` and `packages/registry/gates/` are covered.
   - `no-zero-fallback` also bans defaults of 0 and zero-fallback conditionals, and follows names bound to a zero. `no-number-coercion` also bans the bitwise idioms and `Number` passed as a function.
   - `no-filtered-sum` covers all of `apps/` and `packages/`, as the other bans do, not only `packages/*/src`; it also covers averages, maxima and minima over a filtered array, which drop unknowns the same way, and any test for a missing value in the body of a loop that keeps a running total, not only a test on the item added.
   - `no-total-outside-engine` reads "totals outside `packages/engine` go through the engine's helper" as a ban on every running sum outside the engine, layout offsets included (round 2, adversarial finding 7).
   - `no-computed-import` covers all of `apps/` and `packages/`, not only `packages/*/src`, and also bans `createRequire`, `import.meta.glob`, `eval` and `Function`, which hide an edge the same way.
   - The `lint-bans` check fails on a script, style or markup file no ban reads, rather than skipping it (round 2, adversarial finding 12).
   - The shadow ban also covers `text-shadow`, `drop-shadow()` and `feDropShadow` (the brand has no shadows, prompt 3 section 5.1).
   - Four boundary rules go beyond the section 6 list: `browser-code-reaches-no-server-code` (without it, the view-model browser entry could import registry and pass it to `apps/web`), `not-to-unresolvable`, `packages-do-not-import-apps`, and `package-internals-only-through-exports` (without it, a relative import reached the functions that issue gate sources).
2. **Narrower than the letter.** "Only apps/api imports packages/db and view-model/server" is read as production code: guardrail cases in `tests/guardrails/` and `tests/proposed/` may import them, because an indexed case such as G4-20 (the app role cannot update a candidate row) must drive the database layer from its case file. `tests/e2e/` may not. To make the rule literal, remove `CASE_FOLDERS` from the two `pathNot` lists in `.dependency-cruiser.cjs`; the cases must then reach the database through `apps/api`.
3. **"Internals" read as any file.** "ui and viewer import no domain, engine or registry internals" is read as no import from those packages at all, entries included, because the API returns display objects with their badges already resolved (prompt 3 section 6).
4. **Named colours need a style context.** A colour word in prose ("White text on a drawing") is copy, not a colour, so named colours are reported only where a style value is expected. Hex colours, colour functions and Tailwind colour classes are reported in any string.

## How to reverse

- A rule: remove its entry from `configs.recommended` in `index.js` (and its row above). A boundary: remove its entry from `forbidden` in `.dependency-cruiser.cjs` and its seeded files and `expectations.json` lines.
- The default-of-0 part of `no-zero-fallback`: set `'sovitech/no-zero-fallback': ['error', { defaults: false }]` in `index.js`.
- The inline-disable guard: set `allowInlineConfig: true` in `tools/checks/lint-bans/lint-bans.ts`, or drop the `lint-bans` check.

Each of these lets more code through, so each is listed in the build log for review before it is made.

## Draft for docs/adr/0007-lint-bans.md

The integrator writes the ADR (this folder may not edit `docs/adr/`). Suggested content:

(Updated 2026-09-25 after the phase 0 review: seven rules, the `no-filtered-sum` rule and the narrowed port entry. Updated again after the phase 0 review round 2: nine rules, with `no-filtered-sum` extended to reducers and loops, `no-total-outside-engine` and `no-computed-import` added, `.mts` and `.cts` in scope, the unread-extension scan, and the scan roots read from `tools/checks/scan-roots/roots.json`.)

- **Title.** Lint bans and package boundaries.
- **Status.** Accepted: default, reversible.
- **Date.** 2026-09-25.
- **Context.** Prompt 3 sections 6 ("Boundaries", "Brand assets"), 7 and 10 ("Phase 0"); guardrails rules 1 ("Unknown propagates", "Enforced by"), 2 ("Enforced by"), 8 and 9; build-readiness 3 "Now" item 2; PRD R-156; D-33 (monorepo and tooling are a default under D-33, as ADR 0001 records).
- **Decision.** A local ESLint plugin with nine rules (above) scoped to `apps/` and `packages/` (`.mts` and `.cts` included), with `no-total-outside-engine` on everything but `packages/engine`; a documented allowlist of four entries (the API one narrowed to `apps/api/src/port.ts`); CSS linted with `@eslint/css` in tolerant mode; dependency-cruiser with twelve boundary rules on the "lint:deps" roots of `tools/checks/scan-roots/roots.json`, which `pnpm lint:deps` reads through `tools/checks/scan-roots/lint-deps.ts`; and a `lint-bans` check that runs the bans with inline configuration off, fails an empty scope and any script, style or markup file no ban reads, and self-tests every rule on seeded inputs. The readings in "Readings recorded for review" above. (Written into `docs/adr/0007-lint-bans.md` at integration, 2026-09-25.)
- **Consequences.** Code in `apps/` and `packages/` cannot default a value to 0 (literally or through a zero constant), total a filtered array that dropped its unknowns or keep a running total that skips them, make a total outside the engine, load a module by a computed path, coerce a number by hand, write a colour outside the tokens file, or draw a shadow, and an `eslint-disable` comment does not change that in `pnpm checks`. Non-engineering running sums outside the engine (layout offsets) must be rewritten or allowlisted after review. Non-engineering code pays a small cost (an explicit value instead of a default of 0). The number parser and the formatting module must live at the allowlisted paths. Guardrail cases may import `db` and the view-model server side directly.
- **How to reverse.** As in "How to reverse" above.
