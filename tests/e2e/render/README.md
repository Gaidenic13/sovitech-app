# The render test

Guardrails rule 2, "Render test"; 2.8 "Reserved terms"; cases G2-1 and G2-8; F-RENDER-06. The decisions and the reading of rule 2 are in `docs/adr/0006-render-test.md`.

## For a component that shows a value

- Put every number inside an element carrying `data-value-id="<subject kind>:<subject id>.<field path>"`, with the value id of the display object the API served. Badges, source lines and status lines sit inside that same element.
- Show only what the display object serves. Inside a value element, every text holding a number must be made of the display object's `text`, its `lines` (badge, source line, status lines), the `parts` it declares for pieces a component renders apart (the figure and its unit), or its evidence excerpts. A value element never holds another value element, and never ties other numbers.
- Each number in a 2.8 status line or a rule 7 count ("<n> things for you to check") sits in its own element with its own value id. Never put these on the allowlist. Numbers written as words ("Two things for you to check") count as numbers.
- Show a value's formatted text and nothing else: no count-up, no animation, no number in CSS generated content or list markers, no number that appears only on hover or focus.
- A date renders as `<time datetime="2026-09-25">25 Sep 2026</time>`, in a format the allowlist lists.
- The stepper is one `<ol data-render-stepper="wizard-step-number">` of exactly eight `<li>` items. An item shows its step number, marked `data-render-allow="wizard-step-number"` and equal to its position, and the registered title of its step (Project, Documents, Building, Systems, Operations, Goals, Automation, Proposal), nothing else; a completed step shows its title only. A character counter carries `data-render-allow="character-counter"` and `data-counter-for="<field id>"`, and its text is `<length> / <maxlength>` of that field.
- No canvas, img, video, embed, object, SVG image, image input, CSS image (`url()` in a background, border image, mask or generated content), or inline SVG drawing larger than 32 px with no text, unless its element carries `data-render-unreadable="<id>"` naming an entry of the reviewed `unreadable` list in `allowlist.ts`. Icons of 32 px or less pass.
- Since phase 1, an entry for an element that loads no file (a canvas, a CSS image, an inline SVG drawing) names the one component file that draws it (`component`, a path under `apps/` or `packages/`), and the render check's source scan (`tools/checks/render/unreadable-markers.ts`) accepts its marker only in that file: this harness cannot tell which source file drew an element, so the entry is confined in the source. Every marker in `apps/` and `packages/` is set with a literal entry id (a computed value or the DOM dataset form is refused), and an entry whose component no longer sets its marker is stale. An entry for a file-loading element is confined by its `src` pattern instead.
- Since phase 1, fixed interface copy that reads as a quantity is refused by the allowlist schema: a number next to a unit of guardrails rule 8 ("TEST 12 kW", "34.500 mp", "12kW") or next to a word that names what a count counts ("TEST rooms 212", "12 camere"). An engineering value renders bound to a value id, never as fixed copy. "Max file size 500 MB" passes. A unit test reads rule 8's table of `docs/guardrails.md` and fails when one of its units is unknown here.
- Do not show upload percentages, file sizes, page numbers or numeric chart ticks (proposal 7.2.30 is not approved).
- Set `data-render-ready` on `<body>` once the screen has rendered the data it asked for. A screen that shows values and never sets it fails.

## For copy that holds a reserved term

Shown copy (text, aria-label, title, placeholder, alt, button values, `::before` and `::after` content) holds no reserved term of 2.8, except in the places 2.8 allows, which the app marks on the element that holds the whole text:

| Marker | Passes when |
|---|---|
| `data-copy-kind="badge"`, `"status-line"`, `"action-label"`, `"registry-qualifier"`, `"generated-sentence"` | a registered allowance of that same kind (packages/registry, `REGISTERED_ALLOWANCE_ENTRIES`, 2.8's own texts since phase 1) covers the whole text; and, for `badge`, `status-line` and `generated-sentence`, a display object the screen was served carries that text among its `lines`, with each slot filled as its type allows (a date, a number). The stage 3 label "Formal quotation" passes only when that display object names its stored quotation record (`quotationRecordId`; rule 10) |
| `data-copy-kind="evidence-excerpt"` with `data-document-id` and `data-content-hash` | the display objects the screen was served declare that excerpt, with that document id and content hash |

A marker alone allows nothing.

## Files

| File | What it is |
|---|---|
| `allowlist.ts` | The one reviewed allowlist. Rule 2's four categories only; each entry with its reason and source; plus the reviewed `unreadable` list (at phase 0, the brand logo only); each new entry listed in `docs/build-log.md` for the owner |
| `allowlist-schema.ts` | Its validation, shared with `tools/checks/render` |
| `contract.ts` | Attribute names, the value id pattern, the scanned attributes, number words, display-object and copy-unit types, violation kinds and the case or rule each belongs to |
| `display-objects.ts` | Validation of display objects; reading a harness page's declared display objects |
| `api-display-objects.ts` | The one registered source of an app screen's display objects: what the page receives from the API (`displayObjectsFromApi()`) |
| `in-page.ts` | The harness injected into every frame before the page's scripts: the snapshot scan, the timeline recorder, the copy units, readiness and timers, the hover and focus events |
| `rendered-copy.ts` | The reserved-term scan of the copy units, with the matcher from `@sovitech/registry/reserved-terms` |
| `timeline.ts` | The G2-8 reading of a recorded timeline |
| `render-check.ts` | `prepareRenderCheck`, `runRenderCheck`, `resetRenderCheck`, `checkUrl`, `formatRenderReport` |
| `screens.ts` | Every app screen and state the render test visits, each with `displayObjects`: `displayObjectsFromApi()`, or `{}` when it shows no value; add each one you build |
| `screens-schema.ts` | The rules for a screen entry, shared with `tools/checks/render`; `screenDisplayObjects` |
| `render.spec.ts` | The Playwright `render` project: the screens, plus canaries in this runner |
| `run-guard-reporter.ts` | The Playwright run guard: fails skipped, fixme and fail-marked tests, and a render run without one passing test per screen |
| `harness-pages.ts` | The harness's own pages in `tests/e2e/pages/`, with the violation kinds (and counts) each must produce. Each page declares its display objects in a JSON tag; its values are TEST values in a digit pattern |

## Commands

| Command | What it runs |
|---|---|
| `pnpm test:render` | The render test on the app screens, and the canaries. It builds and serves the web app itself and never reuses a server already on port 4173 |
| `pnpm vitest run tests/guardrails/G2-1.test.ts tests/guardrails/G2-8.test.ts tools/checks/render` | The indexed cases on the harness pages, the reserved-term pages, the API adapter against a TEST server, and the check's unit tests |
| `pnpm checks -- --only render` | The allowlist, the screen list and the harness pages' declarations; `pnpm check:selftest -- --only render` runs the real files as the good control, then its seeded bad inputs, each of which must fail for its stated reason |

## In an e2e flow

```ts
await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });   // before the first page.goto
await page.goto('/projects/demo/step/3');
expect((await runRenderCheck(page)).ok).toBe(true);
await page.getByRole('button', { name: 'Edit' }).click();   // an owner action that changes a value
await resetRenderCheck(page);                                 // a new observation; display objects keep coming from the API
const report = await runRenderCheck(page);
expect(report.ok, formatRenderReport(report)).toBe(true);
```

Code that must run inside the page belongs in `in-page.ts`. Callbacks handed to `frame.evaluate` stay one-line calls into `window.__sovitechRenderHarness`: a build tool can wrap a longer function in helpers the page does not have.
