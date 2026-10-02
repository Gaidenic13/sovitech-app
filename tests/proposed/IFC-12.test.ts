/**
 * ifc-input 5.4 IFC-12 (proposed; not indexed in docs/guardrails.md section 7; the non-blocking suite):
 * "IfcConvert SVG plan with areas printed | Render test fails" (rule 2, G2-1; ifc-input 6.2.15 describes the gap
 * for text drawn into a canvas, a texture or a raster plan). It waits for D-03, D-04 and D-01 (a plan of a stored
 * model in the live app; PRD R-025, R-084 "Until decided": no plan component is built) and for `view-provenance`
 * (proposal 7.2.8, ifc-input 6.2.15) for anything a plan would show from a model.
 *
 * The plan here is the phase 4 viewer spike's (docs/adr/0046-viewer-spike.md): a storey of the synthetic ARH fixture,
 * cut from That Open's Fragments geometry as one inline SVG path in `currentColor`, with no text (it is never
 * IfcConvert's `--print-space-areas`; prompt 3 section 8, "Plans"). The spike's own tests prove the plan holds no text
 * element and none of the model's words (packages/viewer-spike/src/plan/section.test.ts). This file runs the render
 * test on it in Chromium:
 * - the case: the same plan with a space's area printed into it, as IfcConvert would print it, fails the render
 *   test on that unbound number;
 * - beside the case (found while writing it, phase 4): the plan with no text does not pass either. An inline SVG
 *   larger than an icon draws pixels the render test cannot read (G2-1's `unreadable-pixels`, the harness page
 *   g2-1/svg-path-glyphs.html), so a live plan needs a reviewed `render.unreadable` entry, which widens the render
 *   test's exception list: a loosening (guardrails section 10), proposal P-4-PLAN-UNREADABLE in docs/build-log.md.
 *   The plan builds nothing live until D-03 is decided, so nothing is blocked meanwhile.
 *
 * The conversion runs in this process on the synthetic fixture only (the spike's sandbox runs it for the live
 * store's path; ADR 0046). No owner model is read.
 */
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkUrl, formatRenderReport, violationKinds } from '../e2e/render/render-check';
import { convertModel, storeyPlans } from '../../packages/viewer-spike/src/index';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const wasmDirectory = `${realpathSync(join(repoRoot, 'packages/viewer-spike/node_modules/web-ifc'))}/`;

let browser: Browser | undefined;
let folder = '';
let plan = '';

/** A page that shows one storey plan and nothing that holds a value: it is served no display object. */
function planPage(name: string, svg: string): string {
  const path = join(folder, `${name}.html`);
  writeFileSync(
    path,
    `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Storey plan</title></head>
  <body>
    <main>
      <h1>Storey plan</h1>
      <figure style="width: 640px; height: 480px; margin: 0">${svg}</figure>
    </main>
  </body>
</html>
`,
  );
  return pathToFileURL(path).href;
}

function launched(): Browser {
  if (browser === undefined) throw new Error('Chromium did not launch.');
  return browser;
}

beforeAll(async () => {
  folder = mkdtempSync(join(tmpdir(), 'sovitech-ifc-12-'));
  const conversion = await convertModel(join(repoRoot, 'fixtures/ifc/demo-hotel-arh.ifc'), wasmDirectory);
  const drawn = storeyPlans(conversion.fragments).flatMap((storey) => (storey.svg === undefined ? [] : [storey.svg]));
  plan = drawn[0] ?? '';
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
  if (folder !== '') rmSync(folder, { recursive: true, force: true });
});

describe('ifc-input 5.4 IFC-12 · rule 2 · G2-1: a storey plan with areas printed into it', () => {
  it('IFC-12 · waits for D-03, D-04, D-01 and ifc-input 6.2.15: the ARH fixture\'s plan with a space\'s area printed into it fails the render test on that unbound number', async () => {
    expect(plan.startsWith('<svg ')).toBe(true);
    // As IfcConvert's --print-space-areas would: a text element in the plan, holding the space's area.
    const printed = plan.replace(/<\/svg>$/u, '<text x="10" y="20" fill="currentColor">TEST 24 m²</text></svg>');
    const report = await checkUrl(launched(), planPage('printed', printed), { displayObjects: {} });
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(false);
    expect(report.violations.some((item) => item.kind === 'bare-digit' && item.caseId === 'G2-1' && item.text.includes('24')), account).toBe(true);
  }, 120_000);

  it('IFC-12 (beside the case) · rule 2 · P-4-PLAN-UNREADABLE: the same plan with no text holds no bare digit, and still fails as pixels the render test cannot read until a reviewed entry names it', async () => {
    expect(plan).not.toMatch(/<(?:text|tspan|textPath|title|desc|foreignObject|image|use)\b/iu);
    const report = await checkUrl(launched(), planPage('lines-only', plan), { displayObjects: {} });
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(false);
    expect(violationKinds(report), account).toEqual(['unreadable-pixels']);
  }, 120_000);
});
