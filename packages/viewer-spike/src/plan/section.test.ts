/**
 * Storey plans cut from the converted geometry (docs/adr/0046-viewer-spike.md; the plan input of
 * ifc-input 5.4's IFC-12, which the proposed suite runs while D-03, D-04 and D-01 are open): every
 * plan is lines only, with no text element and none of the model's words; a storey with no shape
 * to cut has no plan.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { convertModel } from '../convert/convert';
import { type StoreyPlan, storeyPlans } from './section';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const wasmDirectory = `${realpathSync(fileURLToPath(new URL('../../node_modules/web-ifc', import.meta.url)))}/`;

/** Elements a plan must never hold: anything that draws text, or embeds a picture, a link or another document. */
const TEXT_OR_EMBED = /<(?:text|tspan|textPath|title|desc|foreignObject|image|use|a|style|script|font|metadata)\b/i;

/**
 * The names the model gives its storeys, spaces and equipment, where a name holds a letter (a name of
 * digits only, such as a room number, cannot be told apart from a coordinate in path data; the
 * no-character-data check above covers it).
 */
function namesIn(path: string): string[] {
  const text = readFileSync(path, 'latin1');
  return [...text.matchAll(/IFC(?:BUILDINGSTOREY|SPACE|UNITARYEQUIPMENT|FLOWTERMINAL|BUILDINGELEMENTPROXY)\('[^']*',#\d+,'([^']+)'/g)]
    .map((match) => match[1] ?? '')
    .filter((name) => /\p{L}/u.test(name));
}

describe('storey plans from the converted geometry', () => {
  const plans = new Map<string, StoreyPlan[]>();

  beforeAll(async () => {
    for (const name of ['demo-hotel-arh.ifc', 'demo-hotel-mep-rev-a.ifc']) {
      const conversion = await convertModel(`${repoRoot}fixtures/ifc/${name}`, wasmDirectory);
      plans.set(name, storeyPlans(conversion.fragments));
    }
  });

  it('ifc-input 5.4 IFC-12 (plan input) · rule 2 · every storey plan of the fixture models is lines only: no text, title, description, image or embedded content', () => {
    const drawn = [...plans.values()].flat().flatMap((plan) => (plan.svg === undefined ? [] : [plan.svg]));
    expect(drawn.length).toBeGreaterThan(0);
    for (const svg of drawn) {
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg).toContain('<path ');
      expect(svg).not.toMatch(TEXT_OR_EMBED);
      // No character data between tags: nothing the render test could read, and nothing it could miss.
      expect(svg).not.toMatch(/>[^<]*[^\s<][^<]*</);
      // The page's own colour: no colour literal in the plan.
      expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    }
  });

  it("ifc-input 5.4 IFC-12 (plan input) · rule 13 · no plan holds a storey's, a space's or an element's name from the model", () => {
    for (const [name, list] of plans) {
      const names = namesIn(`${repoRoot}fixtures/ifc/${name}`);
      expect(names.length).toBeGreaterThan(0);
      for (const plan of list) {
        for (const word of names) expect(plan.svg ?? '').not.toContain(word);
      }
    }
  });

  it('rule 7 · ifc-input 6.3.2 · one entry per storey; a storey with no shape to cut has no plan (the page reads "Not available yet")', () => {
    const arh = plans.get('demo-hotel-arh.ifc') ?? [];
    expect(arh).toHaveLength(6);
    for (const plan of arh) expect(plan.svg === undefined).toBe(plan.segments === 0);
    expect(arh.some((plan) => plan.svg === undefined)).toBe(true);
  });
});
